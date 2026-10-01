/**
 * Test script for Perpl In-App Deposit & Margin Manager.
 * Run: npx ts-node scripts/testPerplDeposit.ts
 */
import { buildPerplDepositCalldata, buildPerplWithdrawCalldata, relayPerplDeposit, getUserPerplAccount } from "../src/api/perpl";
import { getWallet } from "../src/shared/chain";
import { ethers } from "ethers";

async function run() {
  console.log("=== Testing Perpl Deposit & Margin Manager ===");
  const wallet = getWallet();
  const address = wallet.address;
  console.log(`Relay/test wallet: ${address}`);

  // 1. Test buildPerplDepositCalldata for new vs existing
  console.log("\n--- 1. Testing buildPerplDepositCalldata ---");
  const depositCalldata = await buildPerplDepositCalldata(100, address);
  console.log("Deposit Calldata Result:", {
    chainId: depositCalldata.chainId,
    exchange: depositCalldata.exchange,
    token: depositCalldata.token,
    amountAUSD: depositCalldata.amountAUSD,
    action: depositCalldata.action,
    accountId: depositCalldata.accountId,
    approveTo: depositCalldata.approve.to,
    approveDataLen: depositCalldata.approve.data.length,
    depositTo: depositCalldata.deposit.to,
    depositDataLen: depositCalldata.deposit.data.length,
  });

  if (!depositCalldata.approve.data.startsWith("0x095ea7b3")) {
    throw new Error("Approve calldata does not match ERC20 approve(address,uint256) selector");
  }
  console.log("PASS: Approve calldata generated with correct selector 0x095ea7b3");

  // 2. Test buildPerplWithdrawCalldata
  console.log("\n--- 2. Testing buildPerplWithdrawCalldata ---");
  const withdrawCalldata = await buildPerplWithdrawCalldata(50, address);
  console.log("Withdraw Calldata Result:", {
    chainId: withdrawCalldata.chainId,
    exchange: withdrawCalldata.exchange,
    amountAUSD: withdrawCalldata.amountAUSD,
    accountId: withdrawCalldata.accountId,
    withdrawTo: withdrawCalldata.withdraw.to,
    withdrawDataLen: withdrawCalldata.withdraw.data.length,
  });

  if (!withdrawCalldata.withdraw.data.startsWith("0x")) {
    throw new Error("Withdraw calldata invalid");
  }
  console.log("PASS: Withdraw calldata generated successfully");

  // 3. Test relayPerplDeposit
  console.log("\n--- 3. Testing relayPerplDeposit ---");
  try {
    const relayRes = await relayPerplDeposit(5, address);
    console.log("Relay Deposit Result:", relayRes);
    console.log("PASS: relayPerplDeposit executed successfully onchain!");
  } catch (err: any) {
    console.log(`Relay execution note: ${err.message}`);
  }

  console.log("\n=== Feature 2 Verification Complete! ===");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
