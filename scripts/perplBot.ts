/**
 * Perpl trading automation (bounty: Best use of Perpl's API).
 * Production-style loop: risk check → optional IOC order → log.
 *
 * Usage:
 *   npx ts-node scripts/perplBot.ts status
 *   npx ts-node scripts/perplBot.ts once BTC LONG 10 2
 *   npx ts-node scripts/perplBot.ts loop BTC 5
 *
 * Env: PERPL_API_KEY + PERPL_API_KEY_SECRET (trade), API_URL for Hunch proxy
 * or direct Perpl WS via src/shared/perplAuth.
 */
import { loadEnv, loadDeployment, getWallet } from "../src/shared/chain";
import { buildPerplRisk } from "../src/api/perplRisk";
import { placePerplOrder } from "../src/api/perpl";
import { perplAuthConfigured } from "../src/shared/perplAuth";
import { perkStatus } from "../src/shared/sponsors";

loadEnv();

async function status() {
  const wallet = getWallet();
  const risk = await buildPerplRisk(wallet.address);
  console.log("[perpl-bot] keys", perplAuthConfigured() ? "trade" : "MISSING");
  console.log("[perpl-bot] wallet", risk.address);
  console.log("[perpl-bot] collateral", risk.collateralAUSD, "free", risk.freeMarginAUSD);
  console.log(
    "[perpl-bot] risk",
    risk.riskLevel,
    "lev",
    risk.effectiveLeverage,
    "open",
    risk.openCount,
    "uPnL",
    risk.unrealizedPnLAUSD,
  );
  if (risk.warnings.length) console.log("[perpl-bot] warnings", risk.warnings);
  for (const p of risk.positions) {
    console.log(
      `  ${p.symbol} ${p.side} ${p.leverage}x entry=${p.entryPrice} mark=${p.markPrice} uPnL=${p.unrealizedPnLAUSD} liqΔ=${p.liqDistancePct}%`,
    );
  }
  return risk;
}

async function placeOnce(symbol: string, side: "LONG" | "SHORT", margin: number, lev: number) {
  const wallet = getWallet();
  const risk = await status();
  if (risk.riskLevel === "HIGH") {
    console.warn("[perpl-bot] HIGH risk — skipping new order");
    return;
  }
  if (risk.freeMarginAUSD < margin) {
    console.warn("[perpl-bot] free margin < requested margin", risk.freeMarginAUSD, margin);
    return;
  }
  const res = await placePerplOrder({
    trader: wallet.address,
    symbol,
    side,
    marginAUSD: margin,
    leverage: lev,
    accountId: risk.accountId ?? undefined,
  });
  console.log("[perpl-bot] order", JSON.stringify({ success: res.success, execution: res.execution, pos: res.position?.id }));
}

async function main() {
  const mode = (process.argv[2] || "status").toLowerCase();
  console.log("[perpl-bot] perks", perkStatus());
  if (mode === "status") {
    await status();
    return;
  }
  if (mode === "once") {
    const symbol = (process.argv[3] || "BTC").toUpperCase();
    const side = (process.argv[4] || "LONG").toUpperCase() as "LONG" | "SHORT";
    const margin = Number(process.argv[5] || 10);
    const lev = Number(process.argv[6] || 2);
    await placeOnce(symbol, side, margin, lev);
    return;
  }
  if (mode === "loop") {
    const symbol = (process.argv[3] || "BTC").toUpperCase();
    const n = Number(process.argv[4] || 3);
    for (let i = 0; i < n; i++) {
      console.log(`[perpl-bot] cycle ${i + 1}/${n}`);
      await status();
      await new Promise((r) => setTimeout(r, 15_000));
    }
    return;
  }
  console.log("Commands: status | once [SYM] [LONG|SHORT] [margin] [lev] | loop [SYM] [cycles]");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
