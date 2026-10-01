/**
 * Perpl trading automation & analytics CLI (bounty: Best use of Perpl's API & Analytics).
 * Production-style tool supporting orders, TP/SL guards, reverse, close, hedging, and portfolio stress-testing.
 *
 * Usage:
 *   npx ts-node scripts/perplBot.ts status
 *   npx ts-node scripts/perplBot.ts once BTC LONG 10 5 [tp] [sl]
 *   npx ts-node scripts/perplBot.ts reverse <posId>
 *   npx ts-node scripts/perplBot.ts close <posId>
 *   npx ts-node scripts/perplBot.ts guard <posId> <tpPrice> <slPrice>
 *   npx ts-node scripts/perplBot.ts hedge <roundId> <UP|DOWN> <amount> <ratio>
 *   npx ts-node scripts/perplBot.ts stress
 *   npx ts-node scripts/perplBot.ts loop BTC 5
 */
import { loadEnv, getWallet } from "../src/shared/chain";
import { buildPerplRisk, stressTestPerplPortfolio } from "../src/api/perplRisk";
import {
  placePerplOrder,
  closePerplPosition,
  reversePerplPosition,
  updatePerplPositionGuards,
  executeHedgeForHunch,
} from "../src/api/perpl";
import { perplAuthConfigured } from "../src/shared/perplAuth";
import { perkStatus } from "../src/shared/sponsors";

loadEnv();

async function status() {
  const wallet = getWallet();
  const risk = await buildPerplRisk(wallet.address);
  console.log("\n--- PERPL PORTFOLIO STATUS ---");
  console.log(`• Keys Status: ${perplAuthConfigured() ? "Trade-Configured" : "MISSING"}`);
  console.log(`• Trader EOA:  ${risk.address} (Account #${risk.accountId || "None"})`);
  console.log(`• Collateral:  $${risk.collateralAUSD} AUSD (Free: $${risk.freeMarginAUSD} AUSD)`);
  console.log(
    `• Risk Level:  ${risk.riskLevel} | Eff. Leverage: ${risk.effectiveLeverage}x | Open: ${risk.openCount} (L:${risk.longCount} S:${risk.shortCount})`
  );
  console.log(`• Unrealized:  $${risk.unrealizedPnLAUSD} AUSD | Open Notional: $${risk.openNotionalAUSD}`);

  if (risk.warnings.length) {
    console.log(`⚠️  Warnings:   ${risk.warnings.join(" | ")}`);
  }

  console.log("\n--- OPEN POSITIONS ---");
  if (risk.positions.length === 0) {
    console.log("  (No open positions)");
  } else {
    for (const p of risk.positions) {
      const guardInfo = [
        p.tpPrice ? `TP:$${p.tpPrice}` : null,
        p.slPrice ? `SL:$${p.slPrice}` : null,
      ].filter(Boolean).join(" ");
      console.log(
        `  #${p.id} ${p.symbol} ${p.side} ${p.leverage}x | Entry: $${p.entryPrice} | Mark: $${p.markPrice} | PnL: $${p.unrealizedPnLAUSD} (${p.unrealizedPnLPct}%) | LiqΔ: ${p.liqDistancePct != null ? p.liqDistancePct + "%" : "SAFE"} ${guardInfo ? `| ${guardInfo}` : ""}`
      );
    }
  }
  return risk;
}

async function placeOnce(
  symbol: string,
  side: "LONG" | "SHORT",
  margin: number,
  lev: number,
  tpPrice?: number,
  slPrice?: number
) {
  const wallet = getWallet();
  const risk = await status();
  if (risk.riskLevel === "HIGH") {
    console.warn("⚠️  [perpl-bot] HIGH risk — skipping new order");
    return;
  }
  if (risk.freeMarginAUSD < margin) {
    console.warn(`⚠️  [perpl-bot] free margin ($${risk.freeMarginAUSD}) < requested margin ($${margin})`);
    return;
  }

  console.log(`\n[perpl-bot] Placing ${side} ${symbol} $${margin} AUSD @ ${lev}x...`);
  const res = await placePerplOrder({
    trader: wallet.address,
    symbol,
    side,
    marginAUSD: margin,
    leverage: lev,
    tpPrice,
    slPrice,
    accountId: risk.accountId ?? undefined,
  });

  console.log(
    `✅ [perpl-bot] Order executed: ${res.position?.id} (Execution: ${res.execution})`
  );
  if (tpPrice || slPrice) {
    console.log(`🛡️  Guards active: TP=$${tpPrice || "None"} | SL=$${slPrice || "None"}`);
  }
}

async function closePos(positionId: string) {
  const wallet = getWallet();
  console.log(`\n[perpl-bot] 1-Tap Closing position ${positionId}...`);
  const res = await closePerplPosition(positionId, wallet.address);
  console.log(
    `✅ [perpl-bot] Position ${positionId} closed @ $${res.position.closedPrice} | Realized PnL: $${res.realizedPnL} AUSD`
  );
}

async function reversePos(positionId: string) {
  const wallet = getWallet();
  console.log(`\n[perpl-bot] 1-Tap Reversing position ${positionId}...`);
  const res = await reversePerplPosition(positionId, wallet.address);
  console.log(
    `✅ [perpl-bot] Reversed! Closed ${res.closedPosition.id} (${res.closedPosition.side}) -> Opened ${res.newPosition.id} (${res.newPosition.side})`
  );
}

async function updateGuards(positionId: string, tpPrice?: number, slPrice?: number) {
  const wallet = getWallet();
  console.log(`\n[perpl-bot] Setting guards on ${positionId}: TP=$${tpPrice} SL=$${slPrice}...`);
  const res = await updatePerplPositionGuards(positionId, wallet.address, { tpPrice, slPrice });
  console.log(
    `✅ [perpl-bot] Guards updated on ${positionId}: TP=$${res.position.tpPrice} SL=$${res.position.slPrice}`
  );
}

async function hedgeHunch(roundId: string, side: "UP" | "DOWN", amount: number, ratio: number) {
  const wallet = getWallet();
  console.log(
    `\n[perpl-bot] Executing Hedge-My-Hunch cross-product: 60s ${side} $${amount} AUSD @ ${(ratio * 100).toFixed(0)}%...`
  );
  const res = await executeHedgeForHunch({
    trader: wallet.address,
    symbol: "BTC",
    hunchSide: side,
    hunchAmountAUSD: amount,
    hedgeRatio: ratio,
  });
  console.log(
    `✅ [perpl-bot] Delta hedge opened: ${res.position?.id} (${res.position?.side}) with $${res.position?.marginAUSD} AUSD margin on Perpl!`
  );
}

async function runStressTest() {
  const wallet = getWallet();
  console.log(`\n--- RUNNING PORTFOLIO STRESS-TEST FOR ${wallet.address} ---`);
  const report = await stressTestPerplPortfolio(wallet.address);
  console.log(`• Collateral: $${report.currentCollateralAUSD} AUSD | Margin Used: $${report.currentMarginUsedAUSD} AUSD`);
  console.log(`• Max Survivable Market Drop: ${report.maxSurvivableDropPct}%`);
  console.log(`• Max Survivable Market Pump: +${report.maxSurvivablePumpPct}%\n`);

  console.log("SHOCK SCENARIO ANALYSIS:");
  console.log("-------------------------------------------------------------------------");
  console.log("Shock (%) | Projected PnL | Proj. Collat | Margin Util | Status");
  console.log("-------------------------------------------------------------------------");
  for (const sc of report.scenarios) {
    const shockStr = `${sc.shockPct > 0 ? "+" : ""}${sc.shockPct}%`.padEnd(9);
    const pnlStr = `${sc.projectedPnLAUSD >= 0 ? "+" : ""}$${sc.projectedPnLAUSD}`.padEnd(15);
    const colStr = `$${sc.projectedCollateralAUSD}`.padEnd(14);
    const utilStr = `${sc.projectedUtilizationPct}%`.padEnd(13);
    const statusStr = sc.survives ? "✅ SURVIVES" : `❌ LIQUIDATED (${sc.liquidatedPositionsCount} pos)`;
    console.log(`${shockStr} | ${pnlStr} | ${colStr} | ${utilStr} | ${statusStr}`);
  }
  console.log("-------------------------------------------------------------------------");
}

async function main() {
  const mode = (process.argv[2] || "status").toLowerCase();
  if (mode === "status") {
    await status();
    return;
  }
  if (mode === "once") {
    const symbol = (process.argv[3] || "BTC").toUpperCase();
    const side = (process.argv[4] || "LONG").toUpperCase() as "LONG" | "SHORT";
    const margin = Number(process.argv[5] || 10);
    const lev = Number(process.argv[6] || 2);
    const tp = process.argv[7] ? Number(process.argv[7]) : undefined;
    const sl = process.argv[8] ? Number(process.argv[8]) : undefined;
    await placeOnce(symbol, side, margin, lev, tp, sl);
    return;
  }
  if (mode === "close") {
    const posId = process.argv[3];
    if (!posId) {
      console.error("Usage: perplBot.ts close <positionId>");
      process.exit(1);
    }
    await closePos(posId);
    return;
  }
  if (mode === "reverse") {
    const posId = process.argv[3];
    if (!posId) {
      console.error("Usage: perplBot.ts reverse <positionId>");
      process.exit(1);
    }
    await reversePos(posId);
    return;
  }
  if (mode === "guard") {
    const posId = process.argv[3];
    const tp = process.argv[4] ? Number(process.argv[4]) : undefined;
    const sl = process.argv[5] ? Number(process.argv[5]) : undefined;
    if (!posId) {
      console.error("Usage: perplBot.ts guard <positionId> <tpPrice> <slPrice>");
      process.exit(1);
    }
    await updateGuards(posId, tp, sl);
    return;
  }
  if (mode === "hedge") {
    const roundId = process.argv[3] || "demo-round";
    const side = ((process.argv[4] || "UP").toUpperCase()) as "UP" | "DOWN";
    const amount = Number(process.argv[5] || 20);
    const ratio = Number(process.argv[6] || 0.5);
    await hedgeHunch(roundId, side, amount, ratio);
    return;
  }
  if (mode === "stress") {
    await runStressTest();
    return;
  }
  if (mode === "loop") {
    const symbol = (process.argv[3] || "BTC").toUpperCase();
    const n = Number(process.argv[4] || 3);
    for (let i = 0; i < n; i++) {
      console.log(`\n[perpl-bot] cycle ${i + 1}/${n}`);
      await status();
      await new Promise((r) => setTimeout(r, 15_000));
    }
    return;
  }
  console.log("Commands:");
  console.log("  status                                            - View live portfolio & risk metrics");
  console.log("  once <SYM> <LONG|SHORT> <margin> <lev> [tp] [sl]  - Place signed WS order with optional TP/SL");
  console.log("  close <positionId>                                - 1-tap close position");
  console.log("  reverse <positionId>                              - 1-tap reverse position");
  console.log("  guard <positionId> <tp> <sl>                      - Update Take-Profit and Stop-Loss");
  console.log("  hedge <roundId> <UP|DOWN> <amount> <ratio>        - Execute cross-product delta hedge");
  console.log("  stress                                            - Run portfolio shock stress test");
  console.log("  loop <SYM> <cycles>                               - Continuous monitor loop");
}

main().catch((e) => {
  console.error("perplBot error:", e);
  process.exit(1);
});
