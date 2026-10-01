/**
 * Perpl Take Profit / Stop Loss (TP / SL) Guard Keeper
 * Continuously evaluates all open positions with guards and triggers
 * signed WebSocket market IOC close orders when TP or SL thresholds are crossed.
 *
 * Usage:
 *   npx ts-node scripts/perplGuardKeeper.ts
 *   npx ts-node scripts/perplGuardKeeper.ts once
 */
import { loadEnv } from "../src/shared/chain";
import { checkAndExecutePerplGuards } from "../src/api/perpl";
import { perplAuthConfigured } from "../src/shared/perplAuth";

loadEnv();

const POLL_INTERVAL_MS = 5000;

async function run() {
  console.log("=== Hunch Perpl TP / SL Guard Keeper ===");
  console.log(`Perpl auth configured: ${perplAuthConfigured()}`);
  console.log(`Poll interval: ${POLL_INTERVAL_MS}ms`);

  const mode = (process.argv[2] || "").toLowerCase();

  if (mode === "once") {
    console.log("Running single guard check...");
    const executed = await checkAndExecutePerplGuards();
    console.log(`Check complete. Executed triggers: ${executed.length}`);
    for (const ex of executed) {
      console.log(` -> ${ex.triggerType} triggered on ${ex.symbol} ${ex.side} @ $${ex.markPrice} (PnL: $${ex.realizedPnL})`);
    }
    return;
  }

  console.log("Starting guard watcher loop. Press Ctrl+C to stop.\n");
  for (;;) {
    try {
      const executed = await checkAndExecutePerplGuards();
      if (executed.length > 0) {
        console.log(`[${new Date().toISOString()}] Executed ${executed.length} guard triggers:`);
        for (const ex of executed) {
          console.log(` -> ${ex.triggerType} on ${ex.symbol} ${ex.side} @ $${ex.markPrice} (Realized PnL: $${ex.realizedPnL})`);
        }
      }
    } catch (err: any) {
      console.error("[perpl-guard] Error in keeper tick:", err?.message || err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

run().catch((e) => {
  console.error("Fatal guard keeper error:", e);
  process.exit(1);
});
