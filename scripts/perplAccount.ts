import { ethers, Contract } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { loadEnv, loadDeployment, getProvider, getWallet } from "../src/shared/chain";
import { PERPL_TESTNET } from "../src/shared/perpl";
import { perkStatus } from "../src/shared/sponsors";
import { perplAuthConfigured } from "../src/shared/perplAuth";

loadEnv();

const ERC20 = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

const EXCHANGE = [
  "function createAccount(uint256 collateralAmount) external returns (uint64)",
  "function getAccount(uint64 accountId) view returns (tuple(address owner, uint256 collateral, int256 pnl))",
];

async function main() {
  const mode = (process.argv[2] || "status").toLowerCase();
  const dep = loadDeployment();
  const provider = getProvider();
  const wallet = getWallet();
  const exchange = PERPL_TESTNET.exchange;
  const token =
    (dep.perpl as any)?.collateral ||
    PERPL_TESTNET.collateralToken ||
    dep.collateral.address;

  console.log("[perpl-account] perks", perkStatus());
  console.log("[perpl-account] wallet", wallet.address);
  console.log("[perpl-account] exchange", exchange);
  console.log("[perpl-account] token", token);
  console.log("[perpl-account] perplAuth", perplAuthConfigured() ? "configured" : "missing");

  const erc20 = new Contract(token, ERC20, provider);
  const [ausd, mon, allow] = await Promise.all([
    erc20.balanceOf(wallet.address),
    provider.getBalance(wallet.address),
    erc20.allowance(wallet.address, exchange),
  ]);
  console.log("[perpl-account] AUSD", ethers.formatUnits(ausd, 6));
  console.log("[perpl-account] MON", ethers.formatEther(mon));
  console.log("[perpl-account] allowance→exchange", ethers.formatUnits(allow, 6));
  console.log("[perpl-account] min open", PERPL_TESTNET.minAccountOpen, "AUSD");

  const accountsPath = path.join(__dirname, "..", "data", "perpl_accounts.json");
  let linked: number | null = null;
  try {
    const map = JSON.parse(fs.readFileSync(accountsPath, "utf8"));
    linked = map[wallet.address.toLowerCase()] ?? null;
  } catch {
    linked = null;
  }
  console.log("[perpl-account] linked accountId", linked ?? "(none)");

  if (mode !== "create") {
    if (ausd < ethers.parseUnits(String(PERPL_TESTNET.minAccountOpen), 6)) {
      console.log("[perpl-account] NEED AUSD — call POST /v1/wallet/faucet or run create after faucet");
    }
    return;
  }

  const amountHuman = Number(process.argv[3] || "100");
  const amount = ethers.parseUnits(String(amountHuman), 6);
  if (ausd < amount) {
    throw new Error(`Hot wallet AUSD ${ethers.formatUnits(ausd, 6)} < ${amountHuman}`);
  }

  const ex = new Contract(exchange, EXCHANGE, wallet);

  if (allow < amount) {
    console.log("[perpl-account] approving AUSD → exchange…");
    const txA = await (erc20.connect(wallet) as any).approve(exchange, amount);
    console.log("[perpl-account] approve tx", txA.hash);
    await txA.wait();
  }

  console.log("[perpl-account] createAccount", amountHuman, "AUSD…");
  const tx = await (ex as any).createAccount(amount);
  console.log("[perpl-account] createAccount tx", tx.hash);
  const rc = await tx.wait();
  console.log("[perpl-account] status", rc?.status, "block", rc?.blockNumber);

  let accountId: number | null = null;
  for (const log of rc?.logs || []) {
    if (log.address?.toLowerCase() !== exchange.toLowerCase()) continue;
    // data = owner (32) + accountId (32) on AccountCreated-style logs
    if (log.data && log.data.length >= 130) {
      const idWord = "0x" + log.data.slice(66, 130);
      try {
        const n = Number(BigInt(idWord));
        if (n > 0 && n < 1e9) accountId = n;
      } catch {
        /* skip */
      }
    }
  }

  fs.mkdirSync(path.dirname(accountsPath), { recursive: true });
  let map: Record<string, number> = {};
  try {
    map = JSON.parse(fs.readFileSync(accountsPath, "utf8"));
  } catch {
    map = {};
  }
  if (accountId != null && Number.isFinite(accountId)) {
    map[wallet.address.toLowerCase()] = accountId;
    fs.writeFileSync(accountsPath, JSON.stringify(map, null, 2));
    console.log("[perpl-account] wrote local link accountId", accountId);
  } else {
    console.log("[perpl-account] accountId not parsed — check explorer, then POST /v1/perpl/account-link");
  }

  const apiUrl = process.env.API_URL || "http://127.0.0.1:8787";
  if (accountId != null && Number.isFinite(accountId)) {
    try {
      const res = await fetch(`${apiUrl}/v1/perpl/account-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet.address, accountId }),
      });
      console.log("[perpl-account] account-link", res.status, await res.text());
    } catch (e: any) {
      console.warn("[perpl-account] account-link API failed", e?.message || e);
    }
  }

  console.log("[perpl-account] explorer", `https://testnet.monadvision.com/tx/${tx.hash}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
