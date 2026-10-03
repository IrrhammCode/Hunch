import fs from "fs";
import path from "path";
import { ethers } from "hardhat";

async function main() {
  const depPath = path.join(__dirname, "..", "deployments", "monad-testnet.json");
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", signer.address);

  const factory = await ethers.getContractAt("HunchFactory", dep.factory);
  const vault = await ethers.getContractAt("HunchVault", dep.vault);
  const ausd = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)", "function approve(address,uint256) returns (bool)"],
    dep.collateral.address
  );

  console.log("Factory:", dep.factory);
  console.log("Vault:", dep.vault);

  const owner = await factory.owner();
  console.log("Factory Owner:", owner);
  console.log("Signer is owner?", owner.toLowerCase() === signer.address.toLowerCase());

  const defDuration = await factory.defaultDuration();
  const defDelay = await factory.defaultDelayBlocks();
  const defMaxPriceAge = await factory.defaultMaxPriceAge();
  const defBaseFee = await factory.defaultBaseFeeBps();
  const defMaxFee = await factory.defaultMaxFeeBps();
  const defProtocolFee = await factory.defaultProtocolFeeBps();

  console.log("Factory Defaults:", {
    duration: defDuration.toString(),
    delayBlocks: defDelay.toString(),
    maxPriceAge: defMaxPriceAge.toString(),
    baseFeeBps: defBaseFee.toString(),
    maxFeeBps: defMaxFee.toString(),
    protocolFeeBps: defProtocolFee.toString(),
  });

  const vaultAssets = await vault.totalAssets();
  const seedPerRound = await vault.seedPerRound();
  const vaultAUSD = await ausd.balanceOf(dep.vault);
  const signerAUSD = await ausd.balanceOf(signer.address);

  console.log("Vault Status:", {
    totalAssets: vaultAssets.toString(),
    seedPerRound: seedPerRound.toString(),
    vaultAUSDBalance: vaultAUSD.toString(),
    signerAUSDBalance: signerAUSD.toString(),
  });

  const m = await ethers.getContractAt("HunchMarket", "0xd3075D710eBd876Cd379c09581b045Eec96B4136");
  console.log("Market 54 seedProvider:", await m.seedProvider());
  console.log("Market 54 collateralBalance:", (await m.collateralBalance()).toString());
  console.log("Market 54 status:", (await m.status()).toString());
  console.log("Market 54 expiry:", (await m.expiry()).toString());

}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
