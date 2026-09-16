import { ethers } from "ethers";
import {
  ausdContract,
  factoryContract,
  getProvider,
  getWallet,
  loadDeployment,
  marketContract,
} from "../shared/chain";
import { waitForReceipt } from "../shared/pythPull";

export type WalletPosition = {
  roundId: string;
  market: string;
  yes: string;
  no: string;
  status: "open" | "resolved";
  yesWins?: boolean;
  redeemable: boolean;
  estimatedPayout: string;
};

let meCache: { key: string; at: number; body: Awaited<ReturnType<typeof buildSnapshot>> } | null =
  null;
const ME_CACHE_MS = 4000;

async function buildSnapshot(address: string, lookback = 8) {
  const provider = getProvider();
  const dep = loadDeployment();
  const ausd = ausdContract(provider, dep);
  const factory = factoryContract(provider, dep);

  const [ausdBal, monBal, roundCount] = await Promise.all([
    ausd.balanceOf(address),
    provider.getBalance(address),
    factory.roundCount(),
  ]);

  const count = Number(roundCount);
  const start = Math.max(1, count - lookback + 1);
  const ids = Array.from({ length: count - start + 1 }, (_, i) => count - i);

  const settled = await Promise.all(
    ids.map(async (id): Promise<WalletPosition | null> => {
      try {
        const market = (await factory.rounds(id)) as string;
        if (!market || market === ethers.ZeroAddress) return null;
        const m = marketContract(market, provider);
        const [yes, no, statusRaw] = await Promise.all([
          m.yesBalances(address),
          m.noBalances(address),
          m.status(),
        ]);
        if (yes === 0n && no === 0n) return null;

        const statusNum = Number(statusRaw);
        const status = statusNum === 0 ? ("open" as const) : ("resolved" as const);
        let yesWins: boolean | undefined;
        let estimatedPayout = "0";
        if (status === "resolved") {
          yesWins = Boolean(await m.yesWins());
          estimatedPayout = ethers.formatUnits(yesWins ? yes : no, 6);
        }

        return {
          roundId: String(id),
          market,
          yes: ethers.formatUnits(yes, 6),
          no: ethers.formatUnits(no, 6),
          status,
          yesWins,
          redeemable: status === "resolved" && (yesWins ? yes > 0n : no > 0n),
          estimatedPayout,
        };
      } catch {
        return null;
      }
    }),
  );
  const positions = settled.filter((p): p is WalletPosition => p !== null);

  return {
    address,
    ausd: ethers.formatUnits(ausdBal, 6),
    mon: ethers.formatEther(monBal),
    roundCount: count,
    positions,
    explorer: dep.chainId === 10143 ? "https://testnet.monadvision.com" : "",
  };
}

export async function walletSnapshot(address: string, lookback = 8) {
  const key = address.toLowerCase();
  if (meCache && meCache.key === key && Date.now() - meCache.at < ME_CACHE_MS) return meCache.body;
  const body = await buildSnapshot(address, lookback);
  meCache = { key, at: Date.now(), body };
  return body;
}

/** Legacy alias used by demo hot-wallet path. */
export async function demoWalletSnapshot(lookback = 8) {
  return walletSnapshot(getWallet().address, lookback);
}

export function invalidateDemoWalletCache() {
  meCache = null;
}

/** Mint MockAUSD + top up MON for a Privy embedded wallet (testnet only). */
export async function faucetWallet(address: string, amountAUSD = "1000") {
  if (!ethers.isAddress(address)) throw new Error("bad address");
  const wallet = getWallet();
  const provider = getProvider();
  const dep = loadDeployment();
  const ausd = ausdContract(wallet, dep);

  const qty = ethers.parseUnits(amountAUSD, 6);
  const mintTx = await ausd.mint(address, qty);
  await waitForReceipt(provider, mintTx.hash);

  const MON_TOPUP = ethers.parseEther(process.env.FAUCET_MON || "0.05");
  const monBal = await provider.getBalance(address);
  let monTx: string | undefined;
  if (monBal < MON_TOPUP) {
    const send = await wallet.sendTransaction({ to: address, value: MON_TOPUP });
    await waitForReceipt(provider, send.hash);
    monTx = send.hash;
  }

  invalidateDemoWalletCache();
  const snap = await walletSnapshot(address);
  return {
    address,
    ausd: snap.ausd,
    mon: snap.mon,
    mintTx: mintTx.hash,
    monTx,
    alreadyFunded: false,
  };
}

export async function demoRedeem(roundId: number) {
  const wallet = getWallet();
  const provider = getProvider();
  const factory = factoryContract(wallet);
  const count = Number(await factory.roundCount());
  if (roundId < 1 || roundId > count) throw new Error("bad roundId");

  const market = (await factory.rounds(roundId)) as string;
  const m = marketContract(market, wallet);
  if (Number(await m.status()) !== 1) throw new Error("round not resolved");

  const yes = await m.yesBalances(wallet.address);
  const no = await m.noBalances(wallet.address);
  const yesWins = Boolean(await m.yesWins());
  const shares = yesWins ? yes : no;
  if (shares === 0n) throw new Error("nothing to redeem");

  const before = await ausdContract(provider).balanceOf(wallet.address);
  const tx = await m.redeem();
  await waitForReceipt(provider, tx.hash);
  const after = await ausdContract(provider).balanceOf(wallet.address);
  invalidateDemoWalletCache();

  return {
    roundId: String(roundId),
    market,
    tx: tx.hash,
    payout: ethers.formatUnits(after - before, 6),
    sideWon: yesWins ? "UP" : "DOWN",
  };
}

export async function demoFaucetAUSD(amount = "1000") {
  return faucetWallet(getWallet().address, amount);
}
