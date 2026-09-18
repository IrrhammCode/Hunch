import { ethers } from "ethers";
import {
  ausdContract,
  factoryContract,
  getProvider,
  getWallet,
  loadDeployment,
  loadEnv,
  marketContract,
  pythContract,
  vaultContract,
  type Deployment,
} from "../shared/chain";
import { enabledMarkets, symbolForFeed, type MarketMeta } from "../shared/markets";
import { pullPythOnchain, waitForReceipt } from "../shared/pythPull";
import { fetchPriceUpdateAt } from "../shared/hermes";
import { isRateLimitError, sleep } from "../shared/rpcRetry";

loadEnv();

const SEED = () => ethers.parseUnits(process.env.SEED_AUSD || "1000", 6);
const POLL_MS = Number(process.env.KEEPER_POLL_MS || 10000);
const MIN_MON = ethers.parseEther(process.env.KEEPER_MIN_MON || "0.5");

function formatErr(e: any): string {
  const parts = [
    e?.shortMessage,
    e?.reason,
    e?.info?.error?.message,
    e?.error?.message,
    e?.code,
    e?.message,
  ].filter(Boolean);
  return [...new Set(parts.map(String))].join(" | ") || String(e);
}

async function ensureFreshPyth(feedId: string) {
  const wallet = getWallet();
  const dep = loadDeployment();
  const pyth = pythContract(wallet, dep);
  try {
    const px = await pyth.getPriceNoOlderThan(feedId, 90);
    console.log("[keeper] pyth", symbolForFeed(feedId), px.price.toString(), "t", px.publishTime.toString());
  } catch {
    console.log("[keeper] pulling Pyth", symbolForFeed(feedId), "…");
    const pulled = await pullPythOnchain(pyth, feedId, wallet);
    console.log("[keeper] pyth pull", symbolForFeed(feedId), pulled.txHash);
  }
}

async function latestRoundForFeed(dep: Deployment, feedId: string) {
  const factory = factoryContract(getProvider(), dep);
  const id = await factory.latestRoundByFeed(feedId);
  if (!id || id === 0n) return null;
  return { roundId: id, market: (await factory.rounds(id)) as string };
}

async function openRoundForMarket(meta: MarketMeta) {
  const wallet = getWallet();
  const dep = loadDeployment();
  const factory = factoryContract(wallet, dep);

  await ensureFreshPyth(meta.feedId);

  if (dep.vault) {
    const vault = vaultContract(wallet, dep);
    const assets = await vault.totalAssets();
    const seedNeed = await vault.seedPerRound();
    if (assets < seedNeed) {
      throw new Error(`Vault underfunded for ${meta.symbol}: ${assets} < ${seedNeed}`);
    }
    const tx = await vault.seedRound(meta.feedId, { gasLimit: 3_500_000n });
    try {
      await waitForReceipt(wallet.provider!, tx.hash);
    } catch (e) {
      const after = await factory.latestRoundByFeed(meta.feedId);
      if (after && after > 0n) {
        const market = await factory.rounds(after);
        console.warn("[keeper] seed receipt flaky but", meta.symbol, "exists", after.toString());
        return { roundId: after, market: market as string, feedId: meta.feedId };
      }
      throw e;
    }
    const roundId = await factory.latestRoundByFeed(meta.feedId);
    const market = (await factory.rounds(roundId)) as string;
    console.log("[keeper] vault seeded", meta.symbol, roundId.toString(), market, "tx", tx.hash);
    return { roundId, market, feedId: meta.feedId };
  }

  const ausd = ausdContract(wallet, dep);
  const seed = SEED();
  const bal = await ausd.balanceOf(wallet.address);
  if (bal < seed) {
    await (await ausd.mint(wallet.address, seed * 20n)).wait();
  }
  await (await ausd.approve(dep.factory, seed)).wait();
  await ensureFreshPyth(meta.feedId);
  const est = await factory.createAndOpen.estimateGas(meta.feedId, seed, [], { value: 0 });
  const tx = await factory.createAndOpen(meta.feedId, seed, [], {
    value: 0,
    gasLimit: est + 500_000n,
  });
  await waitForReceipt(wallet.provider!, tx.hash);
  const roundId = await factory.latestRoundByFeed(meta.feedId);
  const market = (await factory.rounds(roundId)) as string;
  console.log("[keeper] opened", meta.symbol, roundId.toString(), market, "tx", tx.hash);
  return { roundId, market, feedId: meta.feedId };
}

async function resolveRound(marketAddr: string, feedId: string) {
  const wallet = getWallet();
  const dep = loadDeployment();
  const market = marketContract(marketAddr, wallet);
  const pyth = pythContract(wallet, dep);

  const expiry = Number(await market.expiry());
  const update = await fetchPriceUpdateAt(feedId, expiry, 5);
  if (update.publishTime < expiry || update.publishTime > expiry + 5) {
    throw new Error(`publishTime ${update.publishTime} outside window for ${symbolForFeed(feedId)}`);
  }
  const fee = await pyth.getUpdateFee(update.binaryUpdates);
  let gasLimit = 3_000_000n;
  try {
    gasLimit = (await market.resolve.estimateGas(update.binaryUpdates, { value: fee + 1n })) + 300_000n;
  } catch {
    /* keep */
  }
  const tx = await market.resolve(update.binaryUpdates, { value: fee + 1n, gasLimit });
  await waitForReceipt(wallet.provider!, tx.hash);
  console.log("[keeper] resolved", symbolForFeed(feedId), marketAddr, "yesWins=", await market.yesWins(), "tx", tx.hash);
}

async function claimResidual(marketAddr: string) {
  const wallet = getWallet();
  const dep = loadDeployment();
  const market = marketContract(marketAddr, wallet);
  const expiry = Number(await market.expiry());
  const now = (await wallet.provider!.getBlock("latest"))!.timestamp;
  if (now < expiry + 20) {
    console.log("[keeper] residual wait", expiry + 20 - now, "s", marketAddr.slice(0, 10));
    return;
  }
  try {
    if (dep.vault) {
      const vault = vaultContract(wallet, dep);
      const tx = await vault.claimResidual(marketAddr, { gasLimit: 800_000n });
      await waitForReceipt(wallet.provider!, tx.hash);
      console.log("[keeper] vault residual", marketAddr, tx.hash);
      return;
    }
    const tx = await market.claimResidual({ gasLimit: 500_000n });
    await waitForReceipt(wallet.provider!, tx.hash);
  } catch (e: any) {
    console.log("[keeper] residual skip:", formatErr(e));
  }
}

async function tickMarket(meta: MarketMeta) {
  const wallet = getWallet();
  const dep = loadDeployment();
  const tag = meta.symbol;

  const latest = await latestRoundForFeed(dep, meta.feedId);
  if (!latest) {
    console.log(`[keeper] ${tag} — opening first round`);
    await openRoundForMarket(meta);
    return;
  }

  const market = marketContract(latest.market, wallet);
  const status = Number(await market.status());
  const expiry = Number(await market.expiry());
  const now = (await wallet.provider!.getBlock("latest"))!.timestamp;

  if (status === 0) {
    if (now >= expiry) {
      console.log(`[keeper] ${tag} resolving round`, latest.roundId.toString());
      await resolveRound(latest.market, meta.feedId);
    } else {
      console.log(`[keeper] ${tag} open — ${expiry - now}s left @ ${latest.market}`);
    }
    return;
  }

  await claimResidual(latest.market);
  console.log(`[keeper] ${tag} seeding next after`, latest.roundId.toString());
  await openRoundForMarket(meta);
}

async function tick() {
  const wallet = getWallet();
  const dep = loadDeployment();
  const mon = await wallet.provider!.getBalance(wallet.address);
  if (mon < MIN_MON) {
    throw new Error(
      `Low MON ${ethers.formatEther(mon)} (need ≥ ${ethers.formatEther(MIN_MON)}) — faucet then restart`,
    );
  }

  const markets = enabledMarkets();
  console.log(
    `[keeper] chain=Monad hub markets=${markets.map((m) => m.symbol).join(",")} MON=${ethers.formatEther(mon)} factory=${dep.factory}`,
  );

  for (const meta of markets) {
    try {
      await tickMarket(meta);
    } catch (e: any) {
      console.error(`[keeper] ${meta.symbol} tick error:`, formatErr(e));
      if (isRateLimitError(e)) await sleep(1500);
    }
    // spacing between markets — public RPC 15 req/s
    await sleep(400);
  }
}

async function main() {
  const dep = loadDeployment();
  const markets = enabledMarkets();
  console.log("[keeper] starting multi-market — poll", POLL_MS, "ms");
  console.log("[keeper] factory", dep.factory, "vault", dep.vault ?? "(none)");
  console.log("[keeper] assets", markets.map((m) => `${m.symbol}=${m.feedId.slice(0, 10)}…`).join(" "));
  console.log("[keeper] rpc", process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz");
  for (;;) {
    try {
      await tick();
    } catch (e: any) {
      console.error("[keeper] tick error:", formatErr(e));
      if (String(formatErr(e)).includes("Low MON")) await sleep(30_000);
    }
    await sleep(POLL_MS);
  }
}

main();
