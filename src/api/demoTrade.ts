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
import { pullPythOnchain, waitForReceipt } from "../shared/pythPull";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Hackathon demo path: server wallet commits + executes until Privy UserOps ship.
 * YES = UP, NO = DOWN.
 */
export async function demoTrade(side: "YES" | "NO", amountAUSD: string) {
  const wallet = getWallet();
  const provider = getProvider();
  const dep = loadDeployment();
  const factory = factoryContract(wallet, dep);
  const roundCount = Number(await factory.roundCount());
  if (roundCount === 0) throw new Error("no rounds yet");

  const marketAddr = (await factory.rounds(roundCount)) as string;
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
  await pullPythOnchain(pyth, dep.btcUsdFeedId, wallet);

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

  return {
    mode: "demo-relayer",
    trader: wallet.address,
    roundId: String(roundCount),
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
    explorer: `${dep.chainId === 10143 ? "https://testnet.monadexplorer.com" : ""}/tx/${execHash}`,
  };
}
