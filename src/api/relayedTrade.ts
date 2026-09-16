import { ethers } from "ethers";
import {
  factoryContract,
  getProvider,
  getWallet,
  loadDeployment,
  marketContract,
  pythContract,
} from "../shared/chain";
import { pullPythOnchain, waitForReceipt } from "../shared/pythPull";
import { invalidateDemoWalletCache } from "./wallet";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Execute a committed intent after delay-blocks.
 * Anyone may call executeBuy — shares always credit intent.trader.
 * Used by the Privy path after the embedded wallet signed commitBuy.
 */
export async function executeCommittedIntent(params: {
  trader: string;
  intentId?: string;
  market?: string;
}) {
  const wallet = getWallet();
  const provider = getProvider();
  const dep = loadDeployment();
  const factory = factoryContract(wallet, dep);

  const roundCount = Number(await factory.roundCount());
  if (roundCount === 0) throw new Error("no rounds yet");

  const marketAddr = (params.market || (await factory.rounds(roundCount))) as string;
  const market = marketContract(marketAddr, wallet);
  const status = Number(await market.status());
  if (status !== 0) throw new Error("round not open");

  const now = Number((await provider.getBlock("latest"))!.timestamp);
  const expiry = Number(await market.expiry());
  if (expiry <= now + 5) throw new Error("round too close to expiry — wait for next");

  let intentId: bigint;
  if (params.intentId && params.intentId !== "0") {
    intentId = BigInt(params.intentId);
  } else {
    const next = Number(await market.nextIntentId());
    let found: bigint | null = null;
    for (let i = next - 1; i >= Math.max(1, next - 8); i--) {
      const intent = await market.intents(i);
      const trader = String(intent.trader ?? intent[0] ?? "").toLowerCase();
      const executed = Boolean(intent.executed ?? intent[5]);
      const cancelled = Boolean(intent.cancelled ?? intent[6]);
      if (trader === params.trader.toLowerCase() && !executed && !cancelled) {
        found = BigInt(i);
        break;
      }
    }
    if (found == null) throw new Error("no open intent for trader");
    intentId = found;
  }

  const intent = await market.intents(intentId);
  const trader = String(intent.trader ?? intent[0]);
  const executed = Boolean(intent.executed ?? intent[5]);
  const cancelled = Boolean(intent.cancelled ?? intent[6]);
  if (trader.toLowerCase() !== params.trader.toLowerCase()) {
    throw new Error("intent does not belong to trader");
  }
  if (executed) throw new Error("intent already executed");
  if (cancelled) throw new Error("intent cancelled");

  const delay = Number(await market.delayBlocks());
  const commitBlock = Number(intent.commitBlock ?? intent[4]);
  while ((await provider.getBlockNumber()) < commitBlock + delay) {
    await sleep(400);
  }

  const pyth = pythContract(wallet, dep);
  try {
    await pyth.getPriceNoOlderThan(dep.btcUsdFeedId, 90);
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

  const yes = await market.yesBalances(trader);
  const no = await market.noBalances(trader);
  const [yesWad, noWad] = await market.spotPrices();
  const sideNum = Number(intent.side ?? intent[1]);
  const collateralIn = (intent.collateralIn ?? intent[2]) as bigint;
  const sharesOut = sideNum === 0 ? yes : no;

  invalidateDemoWalletCache();

  return {
    mode: "relayed-execute",
    intentId: intentId.toString(),
    market: marketAddr,
    trader,
    side: sideNum === 0 ? "YES" : "NO",
    sideLabel: sideNum === 0 ? "UP" : "DOWN",
    roundId: String(roundCount),
    amountAUSD: ethers.formatUnits(collateralIn, 6),
    sharesOut: ethers.formatUnits(sharesOut, 6),
    yes: ethers.formatUnits(yes, 6),
    no: ethers.formatUnits(no, 6),
    executeTx: execHash,
    spot: {
      yes: ethers.formatUnits(yesWad, 18),
      no: ethers.formatUnits(noWad, 18),
    },
    explorer: `https://testnet.monadvision.com/tx/${execHash}`,
  };
}
