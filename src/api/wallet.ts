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

/** Clear wallet snapshot cache after chain writes. */
export function clearWalletCache() {
  meCache = null;
}

/** Faucet policy — cap AUSD + MON so mid-demo spam cannot drain the hot wallet. */
export const FAUCET = {
  maxAUSD: Number(process.env.FAUCET_MAX_AUSD || "1000"),
  /** Skip faucet if already at/above this AUSD. */
  fundedAUSDThreshold: Number(process.env.FAUCET_SKIP_AUSD || "250"),
  /** Only send MON if balance below this. */
  monTopup: process.env.FAUCET_MON || "0.05",
  monSkipAbove: process.env.FAUCET_MON_SKIP_ABOVE || "0.02",
  cooldownMs: Number(process.env.FAUCET_COOLDOWN_MS || String(10 * 60 * 1000)),
};

/**
 * Real testnet faucet: Agora AUSD via official faucet contract, then MON gas.
 * Optional fallback: transfer AUSD from the hot wallet if it holds the same token.
 * Official AUSD has no mint() — no MockAUSD path.
 */
export async function faucetWallet(address: string, amountAUSD = "1000") {
  if (!ethers.isAddress(address)) throw new Error("bad address");
  const wallet = getWallet();
  const provider = getProvider();
  const dep = loadDeployment();
  const ausd = ausdContract(wallet, dep);

  const requested = Number(amountAUSD);
  if (!Number.isFinite(requested) || requested <= 0) throw new Error("bad amountAUSD");
  const capped = Math.min(requested, FAUCET.maxAUSD);

  const [ausdBal, monBal] = await Promise.all([
    ausd.balanceOf(address),
    provider.getBalance(address),
  ]);
  const ausdHuman = Number(ethers.formatUnits(ausdBal, 6));

  const needMint = ausdHuman < FAUCET.fundedAUSDThreshold;
  const monSkip = ethers.parseEther(FAUCET.monSkipAbove);
  const needMon = monBal < monSkip;

  if (!needMint && !needMon) {
    const snap = await walletSnapshot(address);
    return {
      address,
      ausd: snap.ausd,
      mon: snap.mon,
      alreadyFunded: true,
      message: "already funded — try again later",
    };
  }

  let mintTx: string | undefined;
  let ausdError: string | undefined;
  if (needMint) {
    const qty = ethers.parseUnits(String(capped), 6);
    try {
      const { agoraFaucetContract } = await import("../shared/chain");
      const faucet = agoraFaucetContract(wallet, dep);
      const tx = await faucet.requestFunds(address);
      await waitForReceipt(provider, tx.hash);
      mintTx = tx.hash;
    } catch (e) {
      console.warn("[faucet] Agora faucet contract failed:", (e as any)?.shortMessage || (e as any)?.message || e);
      try {
        const hotBal = await ausd.balanceOf(wallet.address);
        if (hotBal >= qty) {
          const sendAUSD = await ausd.transfer(address, qty);
          await waitForReceipt(provider, sendAUSD.hash);
          mintTx = sendAUSD.hash;
        } else {
          ausdError = "Agora testnet faucet is temporarily unavailable and backup wallet is empty. Please try again later.";
          console.warn("[faucet] Agora faucet failed and hot wallet has no AUSD to transfer");
        }
      } catch (inner) {
        ausdError = "Agora testnet faucet is temporarily unavailable. Please try again later.";
        console.warn("[faucet] AUSD transfer warning:", (inner as any)?.message || inner);
      }
    }
  }

  let monTx: string | undefined;
  let monError: string | undefined;
  if (needMon) {
    try {
      const topup = ethers.parseEther(FAUCET.monTopup);
      const hotMonBal = await provider.getBalance(wallet.address);
      if (hotMonBal >= topup) {
        const send = await wallet.sendTransaction({ to: address, value: topup });
        await waitForReceipt(provider, send.hash);
        monTx = send.hash;
      } else {
        monError = "Hot wallet has insufficient MON for gas top-up.";
        console.warn("[faucet] Hot wallet MON balance too low for top-up");
      }
    } catch (e) {
      monError = "MON gas top-up failed.";
      console.warn("[faucet] MON send error:", (e as any)?.shortMessage || (e as any)?.message || e);
    }
  }

  // If both AUSD and MON failed, throw a clear error
  if (needMint && !mintTx && needMon && !monTx) {
    throw new Error(ausdError || "Testnet faucet is temporarily unavailable. Please try again in a few minutes.");
  }

  clearWalletCache();
  const snap = await walletSnapshot(address);
  return {
    address,
    ausd: snap.ausd,
    mon: snap.mon,
    mintTx,
    monTx,
    alreadyFunded: false,
    mintedAUSD: needMint ? String(capped) : "0",
    warnings: [ausdError, monError].filter(Boolean),
  };
}
