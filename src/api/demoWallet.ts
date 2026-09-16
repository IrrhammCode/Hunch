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

export type DemoPosition = {
  roundId: string;
  market: string;
  yes: string;
  no: string;
  status: "open" | "resolved";
  yesWins?: boolean;
  redeemable: boolean;
  estimatedPayout: string;
};

let meCache: { at: number; body: Awaited<ReturnType<typeof buildSnapshot>> } | null = null;
const ME_CACHE_MS = 4000;

async function buildSnapshot(lookback = 8) {
  const wallet = getWallet();
  const provider = getProvider();
  const dep = loadDeployment();
  const ausd = ausdContract(provider, dep);
  const factory = factoryContract(provider, dep);

  const [ausdBal, monBal, roundCount] = await Promise.all([
    ausd.balanceOf(wallet.address),
    provider.getBalance(wallet.address),
    factory.roundCount(),
  ]);

  const count = Number(roundCount);
  const start = Math.max(1, count - lookback + 1);
  const ids = Array.from({ length: count - start + 1 }, (_, i) => count - i);

  const settled = await Promise.all(
    ids.map(async (id): Promise<DemoPosition | null> => {
      try {
        const market = (await factory.rounds(id)) as string;
        if (!market || market === ethers.ZeroAddress) return null;
        const m = marketContract(market, provider);
        const [yes, no, statusRaw] = await Promise.all([
          m.yesBalances(wallet.address),
          m.noBalances(wallet.address),
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
  const positions = settled.filter((p): p is DemoPosition => p !== null);

  return {
    address: wallet.address,
    ausd: ethers.formatUnits(ausdBal, 6),
    mon: ethers.formatEther(monBal),
    roundCount: count,
    positions,
    explorer: dep.chainId === 10143 ? "https://testnet.monadexplorer.com" : "",
  };
}

export async function demoWalletSnapshot(lookback = 8) {
  if (meCache && Date.now() - meCache.at < ME_CACHE_MS) return meCache.body;
  const body = await buildSnapshot(lookback);
  meCache = { at: Date.now(), body };
  return body;
}

export function invalidateDemoWalletCache() {
  meCache = null;
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
  const wallet = getWallet();
  const provider = getProvider();
  const ausd = ausdContract(wallet);
  const qty = ethers.parseUnits(amount, 6);
  const tx = await ausd.mint(wallet.address, qty);
  await waitForReceipt(provider, tx.hash);
  const bal = await ausd.balanceOf(wallet.address);
  invalidateDemoWalletCache();
  return { tx: tx.hash, ausd: ethers.formatUnits(bal, 6), minted: amount };
}
