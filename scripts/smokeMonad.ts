import { ethers } from "hardhat";
import { MONAD_TESTNET } from "../config/addresses";
import { fetchLatestPriceUpdate } from "./lib/hermes";

/**
 * Read-only + Hermes smoke test against Monad testnet Pyth.
 * Does not send txs (except optional fee estimate).
 *
 *   PYTH_API_KEY=... npx hardhat run scripts/smokeMonad.ts --network monadTestnet
 */
async function main() {
  const pyth = await ethers.getContractAt(
    [
      "function getUpdateFee(bytes[] updateData) view returns (uint256)",
      "function getPriceUnsafe(bytes32 id) view returns (int64 price, uint64 conf, int32 expo, uint publishTime)",
    ],
    MONAD_TESTNET.pyth
  );

  const code = await ethers.provider.getCode(MONAD_TESTNET.pyth);
  console.log("Pyth code bytes:", (code.length - 2) / 2);

  const unsafe = await pyth.getPriceUnsafe(MONAD_TESTNET.btcUsdFeedId);
  console.log("On-chain getPriceUnsafe (may be stale):", {
    price: unsafe.price.toString(),
    conf: unsafe.conf.toString(),
    expo: Number(unsafe.expo),
    publishTime: Number(unsafe.publishTime),
  });

  if (!process.env.PYTH_API_KEY) {
    console.log("Skip Hermes pull — set PYTH_API_KEY to verify fresh updates.");
    return;
  }

  const update = await fetchLatestPriceUpdate(MONAD_TESTNET.btcUsdFeedId);
  console.log("Hermes latest:", {
    price: update.price.toString(),
    conf: update.conf.toString(),
    expo: update.expo,
    publishTime: update.publishTime,
    chunks: update.binaryUpdates.length,
    firstChunkBytes: (update.binaryUpdates[0].length - 2) / 2,
  });

  const fee = await pyth.getUpdateFee(update.binaryUpdates);
  console.log("getUpdateFee (wei):", fee.toString());
  console.log("smokeMonad OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
