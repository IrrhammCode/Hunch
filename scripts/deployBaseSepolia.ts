/**
 * Deploy Hunch stack to Base Sepolia (Option P multichain settlement).
 * Fill deployments/base-sepolia.json after this succeeds.
 *
 *   npx hardhat run scripts/deployBaseSepolia.ts --network baseSepolia
 *
 * Requires BASE_SEPOLIA RPC + PRIVATE_KEY with ETH on Base Sepolia.
 * Pyth on Base Sepolia: see deployments/base-sepolia.json template.
 */
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("[base] deployer", deployer.address);
  console.log("[base] balance", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const PYTH = process.env.PYTH_BASE || "0x5955c1478f0dAD11bE355b853d1E49d43c81e9d1";
  const seed = ethers.parseUnits(process.env.SEED_AUSD || "1000", 6);

  const Mock = await ethers.getContractFactory("MockAUSD");
  const ausd = await Mock.deploy();
  await ausd.waitForDeployment();
  const ausdAddr = await ausd.getAddress();
  console.log("[base] MockAUSD", ausdAddr);

  const Factory = await ethers.getContractFactory("HunchFactory");
  const factory = await Factory.deploy(ausdAddr, PYTH, deployer.address);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("[base] Factory", factoryAddr);

  const Vault = await ethers.getContractFactory("HunchVault");
  const vault = await Vault.deploy(ausdAddr, factoryAddr, seed);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("[base] Vault", vaultAddr);

  await (await ausd.mint(deployer.address, seed * 200n)).wait();
  await (await ausd.approve(vaultAddr, seed * 50n)).wait();
  await (await vault.deposit(seed * 50n)).wait();

  const out = path.join(__dirname, "..", "deployments", "base-sepolia.json");
  const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
  const next = {
    ...prev,
    network: "Base Sepolia",
    chainId: 84532,
    status: "deployed",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    pyth: PYTH,
    btcUsdFeedId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    collateral: { address: ausdAddr, symbol: "MockAUSD", decimals: 6 },
    factory: factoryAddr,
    vault: vaultAddr,
  };
  fs.writeFileSync(out, JSON.stringify(next, null, 2));
  console.log("[base] wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
