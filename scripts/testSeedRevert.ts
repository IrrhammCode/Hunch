import fs from "fs";
import path from "path";
import { ethers } from "hardhat";

async function main() {
  const depPath = path.join(__dirname, "..", "deployments", "monad-testnet.json");
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("HunchVault", dep.vault);
  const factory = await ethers.getContractAt("HunchFactory", dep.factory);

  const feedId = dep.markets[0].feedId; // BTC feed
  console.log("Testing seedRound for feed:", feedId);

  try {
    await vault.seedRound.staticCall(feedId);
    console.log("Static call succeeded!");
  } catch (err: any) {
    console.error("Static call failed:", err);
    if (err.data) {
      console.log("Revert data:", err.data);
      try {
        const decoded = vault.interface.parseError(err.data);
        console.log("Vault parsed error:", decoded);
      } catch {}
      try {
        const decoded = factory.interface.parseError(err.data);
        console.log("Factory parsed error:", decoded);
      } catch {}
      try {
        const hunchMarket = await ethers.getContractFactory("HunchMarket");
        const decoded = hunchMarket.interface.parseError(err.data);
        console.log("Market parsed error:", decoded);
      } catch {}
    }
  }
}

main().catch(console.error);
