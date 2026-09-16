import fs from "fs";
import path from "path";
import { ethers } from "hardhat";
import { MONAD_TESTNET } from "../config/addresses";

/**
 * Deploy Hunch to Monad testnet:
 * - Real Pyth at MONAD_TESTNET.pyth
 * - MockAUSD (mintable) because Agora AUSD is not on testnet yet
 * - HunchFactory wired to both
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx hardhat run scripts/deployMonadTestnet.ts --network monadTestnet
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  if (Number(net.chainId) !== MONAD_TESTNET.chainId) {
    throw new Error(`Wrong network: expected ${MONAD_TESTNET.chainId}, got ${net.chainId}`);
  }

  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MON");
  console.log("Pyth:", MONAD_TESTNET.pyth);

  const ausd = await (await ethers.getContractFactory("MockAUSD")).deploy();
  await ausd.waitForDeployment();
  const ausdAddr = await ausd.getAddress();
  console.log("MockAUSD (testnet stand-in):", ausdAddr);

  // Seed deployer with test AUSD for LP / trading
  const mintTx = await ausd.mint(deployer.address, ethers.parseUnits("1000000", 6));
  await mintTx.wait();

  const factory = await (
    await ethers.getContractFactory("HunchFactory")
  ).deploy(ausdAddr, MONAD_TESTNET.pyth, deployer.address);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("HunchFactory:", factoryAddr);

  // Testnet-friendly freshness window (Hermes RTT + inclusion)
  await (await factory.setDefaults(60, 2, 30, 100, 2500, 2000)).wait();

  const deployment = {
    network: MONAD_TESTNET.name,
    chainId: MONAD_TESTNET.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    pyth: MONAD_TESTNET.pyth,
    btcUsdFeedId: MONAD_TESTNET.btcUsdFeedId,
    collateral: {
      address: ausdAddr,
      symbol: "AUSD",
      decimals: 6,
      note: "MockAUSD — Agora AUSD not on testnet. Mainnet: " + "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
    },
    factory: factoryAddr,
    explorer: {
      ausd: `${MONAD_TESTNET.explorer}/address/${ausdAddr}`,
      factory: `${MONAD_TESTNET.explorer}/address/${factoryAddr}`,
      pyth: `${MONAD_TESTNET.explorer}/address/${MONAD_TESTNET.pyth}`,
    },
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "monad-testnet.json");
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log("Wrote", outFile);
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
