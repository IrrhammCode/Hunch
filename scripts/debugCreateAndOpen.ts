import fs from "fs";
import path from "path";
import { ethers } from "hardhat";
import { fetchLatestPriceUpdate } from "./lib/hermes";

/**
 * Diagnose why createAndOpen reverts on testnet.
 */
async function main() {
  const dep = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", "monad-testnet.json"), "utf8")
  );
  const [signer] = await ethers.getSigners();
  const seed = ethers.parseUnits("1000", 6);

  const ausd = await ethers.getContractAt(
    [
      "function balanceOf(address) view returns (uint256)",
      "function allowance(address,address) view returns (uint256)",
      "function approve(address,uint256) returns (bool)",
    ],
    dep.collateral.address
  );
  const factory = await ethers.getContractAt("HunchFactory", dep.factory);
  const pyth = await ethers.getContractAt(
    [
      "function getUpdateFee(bytes[] updateData) view returns (uint256)",
      "function getPriceUnsafe(bytes32 id) view returns (int64 price, uint64 conf, int32 expo, uint publishTime)",
    ],
    dep.pyth
  );

  const bal = await ausd.balanceOf(signer.address);
  const allow = await ausd.allowance(signer.address, dep.factory);
  console.log({
    bal: ethers.formatUnits(bal, 6),
    allow: ethers.formatUnits(allow, 6),
    maxPriceAge: Number(await factory.defaultMaxPriceAge()),
    delayBlocks: Number(await factory.defaultDelayBlocks()),
  });

  console.log("Approve...");
  await (await ausd.approve(dep.factory, seed)).wait();

  console.log("Fetch Hermes (after approve)...");
  const update = await fetchLatestPriceUpdate(dep.btcUsdFeedId);
  const chainNow = (await ethers.provider.getBlock("latest"))!.timestamp;
  console.log({
    hermesPublish: update.publishTime,
    chainNow,
    ageSec: chainNow - update.publishTime,
    chunks: update.binaryUpdates.length,
    chunk0Len: update.binaryUpdates[0].length,
  });

  const fee = await pyth.getUpdateFee(update.binaryUpdates);
  console.log("fee", fee.toString());

  try {
    await factory.createAndOpen.staticCall(dep.btcUsdFeedId, seed, update.binaryUpdates, {
      value: fee,
      from: signer.address,
    });
    console.log("staticCall: OK");
  } catch (e: any) {
    console.log("staticCall revert:", e.shortMessage || e.message);
    console.log("data:", e.data || e.info?.error?.data || e.receipt);
    if (e.data) {
      try {
        console.log("decoded:", factory.interface.parseError(e.data));
      } catch {
        try {
          const marketIface = (await ethers.getContractFactory("HunchMarket")).interface;
          console.log("market decoded:", marketIface.parseError(e.data));
        } catch {
          /* ignore */
        }
      }
    }
  }

  // Estimate gas
  try {
    const gas = await factory.createAndOpen.estimateGas(dep.btcUsdFeedId, seed, update.binaryUpdates, {
      value: fee,
    });
    console.log("estimateGas", gas.toString());
  } catch (e: any) {
    console.log("estimateGas failed:", e.shortMessage || e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
