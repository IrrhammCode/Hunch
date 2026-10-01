/**
 * Test script for Hedge-My-Hunch cross-product hedging engine.
 * Run: npx ts-node scripts/testPerplHedge.ts
 */
import { executeHedgeForHunch, closePerplPosition, getUserPerplAccount } from "../src/api/perpl";
import { getWallet } from "../src/shared/chain";
import { perplAuthConfigured } from "../src/shared/perplAuth";

async function run() {
  console.log("=== Testing Hedge-My-Hunch Cross-Product Engine ===");
  const wallet = getWallet();
  const address = wallet.address;
  console.log(`Trader address: ${address}`);
  console.log(`Perpl auth configured: ${perplAuthConfigured()}`);

  // 1. Test Hedge UP Hunch (Should open SHORT Perp)
  console.log("\n--- 1. Hedging UP 60s Hunch ($10 AUSD @ 50% ratio) ---");
  const upHedge = await executeHedgeForHunch({
    trader: address,
    symbol: "BTC",
    hunchSide: "UP",
    hunchAmountAUSD: 10,
    hedgeRatio: 0.5,
    leverage: 2,
  });

  console.log(`Hunch side: ${upHedge.hunchSide} -> Perp side: ${upHedge.perpSide}`);
  console.log(`Hedge margin: $${upHedge.hedgeMarginAUSD} AUSD (ratio: ${upHedge.hedgeRatio * 100}%)`);
  console.log(`Perpl position opened: ${upHedge.position.id} status=${upHedge.position.status}`);

  if (upHedge.perpSide !== "SHORT") {
    throw new Error(`Expected SHORT perp hedge for UP hunch, got ${upHedge.perpSide}`);
  }
  console.log("PASS: UP Hunch correctly opened protective SHORT on Perpl!");

  // Clean up UP hedge
  await closePerplPosition(upHedge.position.id, address, {
    symbol: upHedge.position.symbol,
    side: upHedge.position.side,
    size: upHedge.position.size,
  });
  console.log("Cleaned up test UP hedge position.");

  // 2. Test Hedge DOWN Hunch (Should open LONG Perp)
  console.log("\n--- 2. Hedging DOWN 60s Hunch ($20 AUSD @ 25% ratio) ---");
  const downHedge = await executeHedgeForHunch({
    trader: address,
    symbol: "BTC",
    hunchSide: "DOWN",
    hunchAmountAUSD: 20,
    hedgeRatio: 0.25,
    leverage: 2,
  });

  console.log(`Hunch side: ${downHedge.hunchSide} -> Perp side: ${downHedge.perpSide}`);
  console.log(`Hedge margin: $${downHedge.hedgeMarginAUSD} AUSD (ratio: ${downHedge.hedgeRatio * 100}%)`);
  console.log(`Perpl position opened: ${downHedge.position.id} status=${downHedge.position.status}`);

  if (downHedge.perpSide !== "LONG") {
    throw new Error(`Expected LONG perp hedge for DOWN hunch, got ${downHedge.perpSide}`);
  }
  console.log("PASS: DOWN Hunch correctly opened protective LONG on Perpl!");

  // Clean up DOWN hedge
  await closePerplPosition(downHedge.position.id, address, {
    symbol: downHedge.position.symbol,
    side: downHedge.position.side,
    size: downHedge.position.size,
  });
  console.log("Cleaned up test DOWN hedge position.");

  console.log("\n=== Feature 4 Hedge-My-Hunch Verification Complete! ===");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
