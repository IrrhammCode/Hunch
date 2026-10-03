import fs from "fs";
import path from "path";
import { ethers } from "hardhat";
import { MONAD_TESTNET } from "../config/addresses";

/**
 * Redeploy Factory + Vault on Monad testnet (Market open() now takes seedProvider).
 * Keeps existing MockAUSD if DEPLOY_FRESH_AUSD!=1.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  if (Number(net.chainId) !== MONAD_TESTNET.chainId) {
    throw new Error(`Wrong chain ${net.chainId}`);
  }

  const depPath = path.join(__dirname, "..", "deployments", "monad-testnet.json");
  const prev = fs.existsSync(depPath) ? JSON.parse(fs.readFileSync(depPath, "utf8")) : null;

  let ausdAddr = prev?.collateral?.address as string | undefined;
  if (!ausdAddr || process.env.DEPLOY_FRESH_AUSD === "1") {
    const ausd = await (await ethers.getContractFactory("MockAUSD")).deploy();
    await ausd.waitForDeployment();
    ausdAddr = await ausd.getAddress();
    await (await ausd.mint(deployer.address, ethers.parseUnits("5000000", 6))).wait();
    console.log("MockAUSD", ausdAddr);
  } else {
    console.log("Reusing AUSD", ausdAddr);
    const ausd = await ethers.getContractAt("MockAUSD", ausdAddr);
    try {
      await (await ausd.mint(deployer.address, ethers.parseUnits("1000000", 6))).wait();
    } catch {
      /* ok */
    }
  }

  const factory = await (
    await ethers.getContractFactory("HunchFactory")
  ).deploy(ausdAddr, MONAD_TESTNET.pyth, deployer.address);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  await (await factory.setDefaults(60, 2, 120, 100, 2500, 2000)).wait();
  console.log("HunchFactory", factoryAddr);

  const seedPerRound = ethers.parseUnits(process.env.SEED_AUSD || "1000", 6);
  const vault = await (
    await ethers.getContractFactory("HunchVault")
  ).deploy(ausdAddr, factoryAddr, seedPerRound);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("HunchVault", vaultAddr);

  // Fund vault as initial LP
  const ausd = await ethers.getContractAt("MockAUSD", ausdAddr);
  const lpAmount = ethers.parseUnits(process.env.VAULT_LP || "50000", 6);
  await (await ausd.approve(vaultAddr, lpAmount)).wait();
  await (await vault.deposit(lpAmount)).wait();
  console.log("Vault seeded with", ethers.formatUnits(lpAmount, 6), "AUSD LP");

  const deployment = {
    network: MONAD_TESTNET.name,
    chainId: MONAD_TESTNET.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    pyth: MONAD_TESTNET.pyth,
    btcUsdFeedId: MONAD_TESTNET.btcUsdFeedId,
    markets: prev?.markets || [
      { symbol: "BTC", pair: "BTC-USD", feedId: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43" },
      { symbol: "ETH", pair: "ETH-USD", feedId: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace" },
      { symbol: "SOL", pair: "SOL-USD", feedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d" },
    ],
    collateral: {
      address: ausdAddr,
      symbol: "AUSD",
      decimals: 6,
      faucet: prev?.collateral?.faucet || "0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C",
      note: prev?.collateral?.note || "Official Agora AUSD on Monad Testnet",
    },
    perpl: prev?.perpl || {
      exchange: "0x1964C32f0bE608E7D29302AFF5E61268E72080cc",
      apiUrl: "https://testnet.perpl.xyz/api",
      wsUrl: "wss://testnet.perpl.xyz",
      chainId: 10143,
    },
    factory: factoryAddr,
    vault: vaultAddr,
    explorer: {
      ausd: `${MONAD_TESTNET.explorer}/address/${ausdAddr}`,
      factory: `${MONAD_TESTNET.explorer}/address/${factoryAddr}`,
      vault: `${MONAD_TESTNET.explorer}/address/${vaultAddr}`,
      pyth: `${MONAD_TESTNET.explorer}/address/${MONAD_TESTNET.pyth}`,
      perpl: `${MONAD_TESTNET.explorer}/address/0x1964C32f0bE608E7D29302AFF5E61268E72080cc`,
    },
  };

  fs.writeFileSync(depPath, JSON.stringify(deployment, null, 2));
  console.log("Wrote", depPath);
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
