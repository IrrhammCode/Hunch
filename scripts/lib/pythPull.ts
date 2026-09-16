import { Contract, Signer } from "ethers";
import { fetchLatestPriceUpdate } from "./hermes";

/**
 * Pull a fresh Pyth price onto Monad in its own tx, then return empty update
 * arrays so factory/market calls stay under Monad's estimateGas quirks.
 *
 * Why: createAndOpen deploys a contract + verifies Hermes VAAs in one shot.
 * Monad charges/schedules on gas_limit and estimateGas often underestimates
 * Pyth verify → OOG with empty revert reason.
 */
export async function pullPythOnchain(
  pyth: Contract,
  feedId: string,
  signer: Signer,
  gasLimit = 5_000_000n
) {
  const update = await fetchLatestPriceUpdate(feedId);
  const fee: bigint = await pyth.getUpdateFee(update.binaryUpdates);
  const tx = await pyth.connect(signer).updatePriceFeeds(update.binaryUpdates, {
    value: fee + 1n,
    gasLimit,
  });
  const receipt = await tx.wait();
  return {
    update,
    fee,
    txHash: tx.hash as string,
    blockNumber: receipt?.blockNumber as number,
  };
}
