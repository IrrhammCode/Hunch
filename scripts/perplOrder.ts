/**
 * Place one REAL Perpl testnet order via Hunch API (signed WS on server).
 * Usage: npx ts-node scripts/perplOrder.ts [SYMBOL] [SIDE] [MARGIN] [LEV]
 * Defaults: BTC LONG 10 2
 */
import { loadEnv } from "../src/shared/chain";

loadEnv();

async function main() {
  const symbol = (process.argv[2] || "BTC").toUpperCase();
  const side = (process.argv[3] || "LONG").toUpperCase() as "LONG" | "SHORT";
  const marginAUSD = Number(process.argv[4] || "10");
  const leverage = Number(process.argv[5] || "2");
  const trader = process.argv[6] || "0xFA9f60689e79030A83817Fd38913667f9d5E21B2";
  const apiUrl = process.env.API_URL || "http://127.0.0.1:8787";

  console.log("[perpl-order]", { symbol, side, marginAUSD, leverage, trader, apiUrl });
  const res = await fetch(`${apiUrl}/v1/perpl/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trader, symbol, side, marginAUSD, leverage }),
  });
  const text = await res.text();
  console.log("[perpl-order] HTTP", res.status, text);
  if (!res.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
