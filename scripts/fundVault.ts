/**
 * Fund vault: approve AUSD → vault.deposit
 * Usage: npx hardhat run scripts/fundVault.ts --network monadTestnet
 */
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const depPath = path.join(__dirname, "..", "deployments", "monad-testnet.json");
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));

  const vaultAddr = dep.vault;
  const ausdAddr = dep.collateral.address;

  console.log("Deployer:", deployer.address);
  console.log("Vault:", vaultAddr);
  console.log("AUSD:", ausdAddr);

  const ausd = await ethers.getContractAt("IERC20", ausdAddr);
  const bal = await ausd.balanceOf(deployer.address);
  console.log("AUSD balance:", ethers.formatUnits(bal, 6));

  if (bal === 0n) {
    // Try faucet
    const faucetAddr = dep.collateral.faucet;
    if (faucetAddr) {
      console.log("Requesting from faucet...");
      const faucet = new ethers.Contract(faucetAddr, [
        "function requestFunds(address) external returns (bool)"
      ], deployer);
      try {
        const tx = await faucet.requestFunds(deployer.address);
        await tx.wait();
        const newBal = await ausd.balanceOf(deployer.address);
        console.log("After faucet:", ethers.formatUnits(newBal, 6));
      } catch (e: any) {
        console.error("Faucet failed:", e.message);
      }
    }
  }

  const lpAmount = ethers.parseUnits("50000", 6);
  const currentBal = await ausd.balanceOf(deployer.address);
  const depositAmt = currentBal < lpAmount ? currentBal : lpAmount;

  if (depositAmt === 0n) {
    console.error("No AUSD to deposit!");
    return;
  }

  console.log("Approving", ethers.formatUnits(depositAmt, 6), "AUSD...");
  const approveTx = await ausd.approve(vaultAddr, depositAmt);
  await approveTx.wait();
  console.log("Approved");

  const vault = new ethers.Contract(vaultAddr, [
    "function deposit(uint256) external",
    "function totalAssets() view returns (uint256)",
  ], deployer);

  console.log("Depositing", ethers.formatUnits(depositAmt, 6), "AUSD...");
  const depositTx = await vault.deposit(depositAmt, { gasLimit: 300_000n });
  await depositTx.wait();
  
  const totalAssets = await vault.totalAssets();
  console.log("Vault total assets:", ethers.formatUnits(totalAssets, 6), "AUSD");
  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
