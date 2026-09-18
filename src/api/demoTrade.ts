import { ethers } from "ethers";
import {
  ausdContract,
  factoryContract,
  getProvider,
  getWallet,
  loadDeployment,
  marketContract,
  pythContract,
} from "../shared/chain";
import { feedIdFor } from "../shared/markets";
import { pullPythOnchain, waitForReceipt } from "../shared/pythPull";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Demo path: server wallet commits + executes. YES = UP, NO = DOWN.
 * `symbol` selects BTC/ETH/SOL market via factory.latestRoundByFeed.
 */
export async function demoTrade(side: "YES" | "NO", amountAUSD: string, symbol?: string) {
  const wallet = getWallet();
  const provider = getProvider();
  const dep = loadDeployment();
  const factory = factoryContract(wallet, dep);
  const feedId = feedIdFor(symbol);
  const roundIdBn = (await factory.latestRoundByFeed(feedId)) as bigint;
  if (!roundIdBn || roundIdBn === 0n) {
    // fallback: last global round
    const count = Number(await factory.roundCount());
    if (count === 0) throw new Error("no rounds yet");
    const marketAddr = (await factory.rounds(count)) as string;
    return demoTradeOnMarket(side, amountAUSD, marketAddr);
  }
  const marketAddr = (await factory.rounds(roundIdBn)) as string;
  return demoTradeOnMarket(side, amountAUSD, marketAddr);
}

async function demoTradeOnMarket(side: "YES" | "NO", amountAUSD: string, marketAddr: string) {
  const wallet = getWallet();
  const provider = getProvider();
  const dep = loadDeployment();
  const factory = factoryContract(wallet, dep);
  const market = marketContract(marketAddr, wallet);
  const status = Number(await market.status());
  if (status !== 0) throw new Error("round not open");

  const now = Number((await provider.getBlock("latest"))!.timestamp);
  const expiry = Number(await market.expiry());
  if (expiry <= now + 8) throw new Error("round too close to expiry — wait for next");

  const amount = ethers.parseUnits(amountAUSD, 6);
  const ausd = ausdContract(wallet, dep);
  const bal = await ausd.balanceOf(wallet.address);
  if (bal < amount) {
    // MockAUSD on testnet
    await waitForReceipt(provider, (await ausd.mint(wallet.address, amount * 5n)).hash);
  }

  const approveTx = await ausd.approve(marketAddr, amount);
  await waitForReceipt(provider, approveTx.hash);

  const sideNum = side === "YES" ? 0 : 1;
  const commitTx = await market.commitBuy(sideNum, amount, 0);
  await waitForReceipt(provider, commitTx.hash);
  const intentId = (await market.nextIntentId()) - 1n;

  const delay = Number(await market.delayBlocks());
  const target = (await provider.getBlockNumber()) + delay;
  while ((await provider.getBlockNumber()) < target) {
    await sleep(400);
  }

  const pyth = pythContract(wallet, dep);
  const feedId = (await market.priceFeedId()) as string;
  try {
    await pullPythOnchain(pyth, feedId, wallet);
  } catch {
    await pullPythOnchain(pyth, dep.btcUsdFeedId, wallet);
  }

  let execHash: string;
  try {
    const est = await market.executeBuy.estimateGas(intentId, [], { value: 0 });
    const execTx = await market.executeBuy(intentId, [], { value: 0, gasLimit: est + 300_000n });
    await waitForReceipt(provider, execTx.hash);
    execHash = execTx.hash;
  } catch {
    const execTx = await market.executeBuy(intentId, [], { value: 0, gasLimit: 2_500_000n });
    await waitForReceipt(provider, execTx.hash);
    execHash = execTx.hash;
  }

  const yes = await market.yesBalances(wallet.address);
  const no = await market.noBalances(wallet.address);
  const [yesWad, noWad] = await market.spotPrices();
  void factory;

  return {
    mode: "demo-relayer",
    trader: wallet.address,
    roundId: intentId.toString(),
    market: marketAddr,
    side,
    amountAUSD,
    intentId: intentId.toString(),
    commitTx: commitTx.hash,
    executeTx: execHash,
    yes: ethers.formatUnits(yes, 6),
    no: ethers.formatUnits(no, 6),
    spot: {
      yes: ethers.formatUnits(yesWad, 18),
      no: ethers.formatUnits(noWad, 18),
    },
    explorer: `https://testnet.monadvision.com/tx/${execHash}`,
  };
}
