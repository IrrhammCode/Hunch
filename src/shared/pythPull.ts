import { Contract, Signer, TransactionReceipt, Provider } from "ethers";
import { fetchLatestPriceUpdate } from "./hermes";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/** Monad public RPC often fails eth_getTransactionReceipt — poll with retries. */
export async function waitForReceipt(
  provider: Provider,
  hash: string,
  attempts = 40,
  delayMs = 500
): Promise<TransactionReceipt> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await provider.getTransactionReceipt(hash);
      if (r) {
        if (r.status === 0) throw new Error(`tx reverted: ${hash}`);
        return r;
      }
    } catch (e) {
      lastErr = e;
    }
    await sleep(delayMs);
  }
  throw new Error(
    `Timeout waiting for receipt ${hash}` +
      (lastErr ? ` (last: ${(lastErr as any)?.shortMessage || (lastErr as any)?.message || lastErr})` : "")
  );
}

export async function pullPythOnchain(
  pyth: Contract,
  feedId: string,
  signer: Signer,
  gasLimit?: bigint
) {
  const update = await fetchLatestPriceUpdate(feedId);
  const connected = pyth.connect(signer) as Contract;
  const fee: bigint = await connected.getUpdateFee(update.binaryUpdates);

  let limit = gasLimit;
  if (limit === undefined) {
    try {
      const est: bigint = await connected.updatePriceFeeds.estimateGas(update.binaryUpdates, {
        value: fee + 1n,
      });
      limit = est + 150_000n;
    } catch {
      limit = 1_200_000n;
    }
  }

  const tx = await connected.updatePriceFeeds(update.binaryUpdates, {
    value: fee + 1n,
    gasLimit: limit,
  });

  const provider = signer.provider!;
  let receipt: TransactionReceipt | null = null;
  try {
    receipt = await waitForReceipt(provider, tx.hash);
  } catch (e) {
    // Receipt RPC flaky — verify price is fresh enough to proceed
    try {
      const px = await connected.getPriceNoOlderThan(feedId, 120);
      console.warn(
        `[pyth] receipt wait failed but on-chain price fresh publishTime=${px.publishTime} — continuing`
      );
      return {
        update,
        fee,
        txHash: tx.hash as string,
        blockNumber: 0,
      };
    } catch {
      throw e;
    }
  }

  return { update, fee, txHash: tx.hash as string, blockNumber: receipt.blockNumber };
}
