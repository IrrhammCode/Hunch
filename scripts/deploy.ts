import { ethers } from "hardhat";

/**
 * Local deploy: MockAUSD + MockPyth + HunchFactory
 * Usage: npx hardhat run scripts/deploy.ts
 */
async function main() {
  const [deployer, feeRecipient] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const ausd = await (await ethers.getContractFactory("MockAUSD")).deploy();
  await ausd.waitForDeployment();

  const pyth = await (await ethers.getContractFactory("MockPyth")).deploy();
  await pyth.waitForDeployment();

  const factory = await (
    await ethers.getContractFactory("HunchFactory")
  ).deploy(await ausd.getAddress(), await pyth.getAddress(), feeRecipient?.address ?? deployer.address);
  await factory.waitForDeployment();

  // Seed deployer with test AUSD
  await (await ausd.mint(deployer.address, ethers.parseUnits("1000000", 6))).wait();

  console.log(
    JSON.stringify(
      {
        ausd: await ausd.getAddress(),
        pyth: await pyth.getAddress(),
        factory: await factory.getAddress(),
        btcUsdFeedId: ethers.id("Crypto.BTC/USD"),
        note: "On Monad testnet, swap MockAUSD→Agora AUSD and MockPyth→Pyth 0x2880aB155794e7179c9eE2e38200202908C17B43",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
