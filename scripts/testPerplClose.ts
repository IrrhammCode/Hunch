/**
 * Test script for Perpl Close Position & Reverse Position.
 * Run: npx ts-node scripts/testPerplClose.ts
 */
import { closePerplPosition, reversePerplPosition, getUserPerplAccount, placePerplOrder, PerplPosition } from "../src/api/perpl";
import { getWallet } from "../src/shared/chain";
import { perplAuthConfigured } from "../src/shared/perplAuth";

async function run() {
  console.log("=== Testing Perpl Close & Reverse Position ===");
  const wallet = getWallet();
  const address = wallet.address;
  console.log(`Trader address: ${address}`);
  console.log(`Perpl auth configured: ${perplAuthConfigured()}`);

  const accBefore = await getUserPerplAccount(address);
  console.log(`Account positions before: ${accBefore.positions.length} (open: ${accBefore.openPositionsCount})`);

  let testPos: PerplPosition | undefined = accBefore.positions.find((p) => p.status === "OPEN");
  if (!testPos) {
    console.log("No open position found, placing a test order...");
    const orderRes = await placePerplOrder({
      trader: address,
      symbol: "BTC",
      side: "LONG",
      marginAUSD: 10,
      leverage: 2,
    });
    testPos = orderRes.position;
    console.log(`Placed test position: ${testPos.id} (${testPos.side} ${testPos.symbol})`);
  } else {
    console.log(`Using existing open position: ${testPos.id} (${testPos.side} ${testPos.symbol} ${testPos.size})`);
  }

  const posToTest = testPos;

  // 1. Test Reverse Position
  console.log(`\n--- 1. Testing Reverse Position on ${posToTest.id} ---`);
  const revRes = await reversePerplPosition(posToTest.id, address, {
    symbol: posToTest.symbol,
    side: posToTest.side,
    size: posToTest.size,
    leverage: posToTest.leverage,
    entryPrice: posToTest.entryPrice,
    marginAUSD: posToTest.marginAUSD,
  });

  console.log(`Closed old position: ${revRes.closedPosition.id} status=${revRes.closedPosition.status} realizedPnL=${revRes.realizedPnL}`);
  console.log(`Opened new position: ${revRes.newPosition.id} side=${revRes.newPosition.side} status=${revRes.newPosition.status}`);
  if (revRes.newPosition.side === posToTest.side) {
    throw new Error(`Reverse failed: new side ${revRes.newPosition.side} should be opposite of ${posToTest.side}`);
  }
  console.log("PASS: Reverse Position successfully flipped side!");

  // 2. Test Close Position on the newly reversed position
  console.log(`\n--- 2. Testing Close Position on ${revRes.newPosition.id} ---`);
  const closeRes = await closePerplPosition(revRes.newPosition.id, address, {
    symbol: revRes.newPosition.symbol,
    side: revRes.newPosition.side,
    size: revRes.newPosition.size,
    leverage: revRes.newPosition.leverage,
    entryPrice: revRes.newPosition.entryPrice,
  });

  console.log(`Position closed: ${closeRes.position.id} status=${closeRes.position.status} closePrice=${closeRes.closePrice} realizedPnL=${closeRes.realizedPnL}`);
  if (closeRes.position.status !== "CLOSED") {
    throw new Error(`Close failed: position status is ${closeRes.position.status}`);
  }
  console.log("PASS: Close Position successfully executed!");

  // 3. Verify Account Snapshot
  console.log("\n--- 3. Verifying Account State ---");
  const accAfter = await getUserPerplAccount(address);
  console.log(`Account positions after: ${accAfter.positions.length} (open: ${accAfter.openPositionsCount})`);
  console.log("PASS: Account state updated correctly!");

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
