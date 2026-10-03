import fs from "fs";
import path from "path";
import { ethers } from "hardhat";

async function main() {
  const depPath = path.join(__dirname, "..", "deployments", "monad-testnet.json");
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const [signer] = await ethers.getSigners();
  const factory = await ethers.getContractAt("HunchFactory", dep.factory);

  console.log("Updating factory defaults on Monad Testnet...");
  console.log("Current maxPriceAge:", (await factory.defaultMaxPriceAge()).toString());

  // Set defaultDuration = 60, delayBlocks = 2, maxPriceAge = 31536000 (1 yr), baseFee = 100 (1%), maxFee = 2500 (25%), protocolFee = 2000 (20%)
  const tx = await factory.setDefaults(60, 2, 31536000, 100, 2500, 2000);
  console.log("tx hash:", tx.hash);
  await tx.wait();
  console.log("Confirmed! New maxPriceAge:", (await factory.defaultMaxPriceAge()).toString());
}

main().catch(console.error);
