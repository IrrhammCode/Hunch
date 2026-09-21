/**
 * Live token prices + OHLC history for mobile charts.
 * Source: Pyth Hermes (latest + TradingView shim) — real data only.
 */
import { loadEnv } from "../shared/chain";
import { feedIdFor, marketBySymbol, MARKETS } from "../shared/markets";
import { HERMES } from "../../config/addresses";

const SYMBOL_MAP: Record<string, string> = {
  BTC: "Crypto.BTC/USD",
  ETH: "Crypto.ETH/USD",
  SOL: "Crypto.SOL/USD",
  MON: "Crypto.MON/USD",
};

function hermesBases(): string[] {
  loadEnv();
  const custom = process.env.HERMES_URL;
  const bases = [
    custom,
    "https://hermes.pyth.network",
    "https://pyth.dourolabs.app/hermes",
  ].filter(Boolean) as string[];
  return bases;
}

async function hermesGet(path: string): Promise<any> {
  let lastErr: Error | null = null;
  for (const base of hermesBases()) {
    try {
      const res = await fetch(`${base}${path}`, { headers: authHeaders() });
      if (!res.ok) {
        lastErr = new Error(`Hermes ${res.status} @ ${base}`);
        continue;
      }
      return await res.json();
    } catch (e: any) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Hermes unreachable");
}

function authHeaders(): Record<string, string> {
  loadEnv();
  const key = process.env.PYTH_API_KEY;
  const h: Record<string, string> = { Accept: "application/json" };
  if (key) h.Authorization = `Bearer ${key}`;
  return h;
}

function normalizeSymbol(s?: string) {
  return (s || "BTC").toUpperCase().replace(/-USD$|\/USD$|USD$/, "");
}

export function pythSymbol(symbol: string) {
  const s = normalizeSymbol(symbol);
  return SYMBOL_MAP[s] || `Crypto.${s}/USD`;
}

export async function fetchLatestPrice(symbol: string) {
  const s = normalizeSymbol(symbol);
  const feed = marketBySymbol(s)?.feedId || feedIdFor(s);
  const id = feed.startsWith("0x") ? feed.slice(2) : feed;
  const json = await hermesGet(`/v2/updates/price/latest?ids[]=${id}&encoding=hex`);
  const p = json?.parsed?.[0]?.price;
  if (!p) throw new Error("Pyth latest empty");
  const price = Number(p.price) * Math.pow(10, Number(p.expo));
  return {
    symbol: s,
    price,
    conf: Number(p.conf) * Math.pow(10, Number(p.expo)),
    expo: Number(p.expo),
    publishTime: Number(p.publish_time),
    feedId: feed,
  };
}

export type PriceBar = { t: number; o: number; h: number; l: number; c: number; v: number };

const CG_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  MON: "monad",
};

async function fetchCoingeckoHistory(symbol: string, bars = 90) {
  const s = normalizeSymbol(symbol);
  const id = CG_IDS[s];
  if (!id) return null;
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const prices: [number, number][] = json?.prices || [];
  if (!prices.length) return null;
  const step = Math.max(1, Math.floor(prices.length / bars));
  const sampled = prices.filter((_, i) => i % step === 0).slice(-bars);
  return sampled.map(([ms, p]) => ({
    t: Math.floor(ms / 1000),
    o: p,
    h: p,
    l: p,
    c: p,
    v: 0,
  }));
}

/** OHLC from Pyth Hermes TradingView shim; CoinGecko fallback for chart curve. */
export async function fetchPriceHistory(
  symbol: string,
  resolution = 1,
  bars = 90,
): Promise<{ symbol: string; resolution: number; bars: PriceBar[]; last?: number; source: string }> {
  const s = normalizeSymbol(symbol);
  const tv = pythSymbol(s);
  const now = Math.floor(Date.now() / 1000);
  const span = resolution * 60 * Math.max(bars, 30);
  const from = now - span;
  const url = `/v2/shims/tradingview/history?symbol=${encodeURIComponent(tv)}&resolution=${resolution}&from=${from}&to=${now}`;
  try {
    const json = await hermesGet(url);
    if (json?.s === "ok" && Array.isArray(json.c) && json.c.length > 1) {
      const t: number[] = json.t || [];
      const o: number[] = json.o || json.c;
      const h: number[] = json.h || json.c;
      const l: number[] = json.l || json.c;
      const c: number[] = json.c;
      const v: number[] = json.v || [];
      const barsOut: PriceBar[] = t.map((ts, i) => ({
        t: ts,
        o: Number(o[i] ?? c[i]),
        h: Number(h[i] ?? c[i]),
        l: Number(l[i] ?? c[i]),
        c: Number(c[i]),
        v: Number(v[i] ?? 0),
      }));
      return {
        symbol: s,
        resolution,
        bars: barsOut.slice(-bars),
        last: barsOut[barsOut.length - 1]!.c,
        source: "pyth-hermes",
      };
    }
  } catch {
    /* fall through */
  }

  const cg = await fetchCoingeckoHistory(s, bars);
  const latest = await fetchLatestPrice(s).catch(() => null);
  if (cg && cg.length) {
    return { symbol: s, resolution, bars: cg, last: latest?.price ?? cg[cg.length - 1]!.c, source: "coingecko" };
  }
  return { symbol: s, resolution, bars: [], last: latest?.price, source: "pyth-latest" };
}

export function catalogMarkets() {
  return MARKETS.map((m) => ({
    symbol: m.symbol,
    pair: m.pair,
    label: m.label,
    feedId: m.feedId,
  }));
}
