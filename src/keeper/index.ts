import {
  ausdContract,
  factoryContract,
  getWallet,
  loadDeployment,
  loadEnv,
  marketContract,
  pythContract,
  vaultContract,
  getProvider,
} from "../shared/chain";
import { fetchPriceUpdateAt } from "../shared/hermes";
import { pullPythOnchain, waitForReceipt } from "../shared/pythPull";
import { ethers } from "ethers";

loadEnv();

const SEED = () => ethers.parseUnits(process.env.SEED_AUSD || "1000", 6);
const POLL_MS = Number(process.env.KEEPER_POLL_MS || 4000);
const MIN_MON = ethers.parseEther(process.env.KEEPER_MIN_MON || "1.0");

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

async function ensureFreshPyth() {
  const wallet = getWallet();
  const dep = loadDeployment();
  const pyth = pythContract(wallet, dep);
  try {
    const px = await pyth.getPriceNoOlderThan(dep.btcUsdFeedId, 90);
    console.log("[keeper] pyth already fresh", px.price.toString(), "t", px.publishTime.toString());
    return;
  } catch {
    console.log("[keeper] pulling Pyth…");
    const pulled = await pullPythOnchain(pyth, dep.btcUsdFeedId, wallet);
    console.log("[keeper] pyth pull", pulled.txHash, "price", pulled.update.price.toString());
  }
}

async function openRound() {
  const wallet = getWallet();
  const dep = loadDeployment();
  const factory = factoryContract(wallet, dep);

  await ensureFreshPyth();

  if (dep.vault) {
    const vault = vaultContract(wallet, dep);
    const assets = await vault.totalAssets();
    const seedNeed = await vault.seedPerRound();
    console.log("[keeper] vault assets", assets.toString(), "seedNeed", seedNeed.toString());
    if (assets < seedNeed) throw new Error(`Vault underfunded: ${assets} < ${seedNeed}`);

    try {
      await vault.seedRound.staticCall(dep.btcUsdFeedId);
    } catch (e: any) {
      throw new Error(`seedRound would revert: ${formatErr(e)}`);
    }

    const tx = await vault.seedRound(dep.btcUsdFeedId, { gasLimit: 3_500_000n });
    try {
      await waitForReceipt(wallet.provider!, tx.hash);
    } catch (e) {
      // Confirm round appeared anyway
      const roundId = await factory.roundCount();
      if (roundId > 0n) {
        const market = await factory.rounds(roundId);
        console.warn("[keeper] seed receipt flaky but round exists", roundId.toString(), market);
        return { roundId, market };
      }
      throw e;
    }
    const roundId = await factory.roundCount();
    const market = await factory.rounds(roundId);
    console.log("[keeper] vault seeded round", roundId.toString(), market, "tx", tx.hash);
    return { roundId, market };
  }

  const ausd = ausdContract(wallet, dep);
  const pyth = pythContract(wallet, dep);
  const seed = SEED();
  const bal = await ausd.balanceOf(wallet.address);
  if (bal < seed) {
    try {
      await (await ausd.mint(wallet.address, seed * 10n)).wait();
    } catch {
      throw new Error(`Insufficient AUSD: have ${bal}, need ${seed}`);
    }
  }

  await (await ausd.approve(dep.factory, seed)).wait();
  await ensureFreshPyth();
  const est = await factory.createAndOpen.estimateGas(dep.btcUsdFeedId, seed, [], { value: 0 });
  const tx = await factory.createAndOpen(dep.btcUsdFeedId, seed, [], {
    value: 0,
    gasLimit: est + 500_000n,
  });
  await waitForReceipt(wallet.provider!, tx.hash);
  const roundId = await factory.roundCount();
  const market = await factory.rounds(roundId);
  console.log("[keeper] opened round", roundId.toString(), market, "tx", tx.hash);
  return { roundId, market };
}

async function resolveRound(marketAddr: string) {
  const wallet = getWallet();
  const dep = loadDeployment();
  const market = marketContract(marketAddr, wallet);
  const pyth = pythContract(wallet, dep);

  const expiry = Number(await market.expiry());
  const update = await fetchPriceUpdateAt(dep.btcUsdFeedId, expiry, 5);
  if (update.publishTime < expiry || update.publishTime > expiry + 5) {
    throw new Error(`publishTime ${update.publishTime} outside window`);
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
  console.log("[keeper] resolved", marketAddr, "yesWins=", await market.yesWins(), "tx", tx.hash);
}

async function claimResidual(marketAddr: string) {
  const wallet = getWallet();
  const dep = loadDeployment();
  const market = marketContract(marketAddr, wallet);
  const expiry = Number(await market.expiry());
  const now = (await wallet.provider!.getBlock("latest"))!.timestamp;
  if (now < expiry + 30) {
    console.log("[keeper] residual wait", expiry + 30 - now, "s");
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
    console.log("[keeper] residual claimed", marketAddr, tx.hash);
  } catch (e: any) {
    console.log("[keeper] residual skip:", formatErr(e));
  }
}

async function tick() {
  const wallet = getWallet();
  const dep = loadDeployment();
  const mon = await wallet.provider!.getBalance(wallet.address);
  if (mon < MIN_MON) {
    throw new Error(
      `Low MON ${ethers.formatEther(mon)} (need ≥ ${ethers.formatEther(MIN_MON)}) — faucet https://faucet.monad.xyz then restart`
    );
  }

  const factory = factoryContract(wallet, dep);
  const roundId = await factory.roundCount();
  console.log(
    "[keeper] roundCount",
    roundId.toString(),
    "MON",
    ethers.formatEther(mon)
  );

  if (roundId === 0n) {
    await openRound();
    return;
  }

  const marketAddr = await factory.rounds(roundId);
  const market = marketContract(marketAddr, wallet);
  const status = Number(await market.status());
  const expiry = Number(await market.expiry());
  const now = (await wallet.provider!.getBlock("latest"))!.timestamp;

  if (status === 0) {
    if (now >= expiry) {
      console.log("[keeper] resolving round", roundId.toString());
      await resolveRound(marketAddr);
    } else {
      console.log(`[keeper] round ${roundId} open — ${expiry - now}s left @ ${marketAddr}`);
    }
    return;
  }

  await claimResidual(marketAddr);
  console.log("[keeper] seeding next round after", roundId.toString());
  await openRound();
}

async function main() {
  const dep = loadDeployment();
  console.log("[keeper] starting — poll", POLL_MS, "ms");
  console.log("[keeper] factory", dep.factory, "vault", dep.vault ?? "(none)");
  console.log("[keeper] rpc", process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz");
  for (;;) {
    try {
      await tick();
    } catch (e: any) {
      console.error("[keeper] tick error:", formatErr(e));
      // Back off harder on low balance / faucet needed
      if (String(formatErr(e)).includes("Low MON") || String(formatErr(e)).includes("insufficient")) {
        await new Promise((r) => setTimeout(r, 30_000));
      }
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main();
