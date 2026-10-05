import { ethers, Contract } from "ethers";
import { getProvider, loadDeployment } from "./chain";
import { marketBySymbol, MARKETS } from "./markets";

export const PERPL_TESTNET = {
  chainId: 10143,
  apiUrl: "https://testnet.perpl.xyz/api",
  wsUrl: "wss://testnet.perpl.xyz",
  exchange: "0x1964c32f0be608e7d29302aff5e61268e72080cc",
  collateralToken: "0xa9012a055bd4e0edff8ce09f960291c09d5322dc",
  minAccountOpen: 100, // 100 AUSD (6 decimals)
};

export type PerplMarketSummary = {
  id: number;
  perpetualId: number;
  symbol: string;
  name: string;
  sizeUnits: string;
  markPrice: number;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  change24hPct: number;
  volume24hAUSD: number;
  openInterest: number;
  fundingRateBps: number;
  maxLeverage: number;
  priceDecimals: number;
  sizeDecimals: number;
  category?: "meme" | "major" | "l1" | "defi" | "l2";
  volatilityTier?: "HOT" | "MODERATE" | "STEADY";
  volatilityScore?: number;
};

let contextCache: { at: number; data: any } | null = null;
const CONTEXT_CACHE_MS = 3000;

export async function fetchPerplContext(): Promise<any> {
  if (contextCache && Date.now() - contextCache.at < CONTEXT_CACHE_MS) {
    return contextCache.data;
  }
  const url = `${PERPL_TESTNET.apiUrl}/v1/pub/context`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Perpl context fetch failed: ${res.status}`);
  const json = await res.json();
  contextCache = { at: Date.now(), data: json };
  return json;
}

export async function getPerplMarkets(): Promise<PerplMarketSummary[]> {
  const ctx = await fetchPerplContext();
  const markets = ctx.markets || [];

  const perplList: PerplMarketSummary[] = markets.map((m: any) => {
    const pDec = m.config?.price_decimals ?? 2;
    const sDec = m.config?.size_decimals ?? 2;
    const pDiv = Math.pow(10, pDec);

    const mark = (m.state?.mrk ?? 0) / pDiv;
    const last = (m.state?.lst ?? 0) / pDiv;
    const prv = (m.state?.prv ?? 0) / pDiv;
    const bid = (m.state?.bid ?? 0) / pDiv;
    const ask = (m.state?.ask ?? 0) / pDiv;

    const change24hPct = prv > 0 ? ((last - prv) / prv) * 100 : 0;
    const dvaRaw = Number(m.state?.dva ?? 0);
    const volume24hAUSD = dvaRaw / 1e6; // AUSD is 6 decimals
    const openInterest = (m.state?.oi ?? 0) / Math.pow(10, sDec);

    // Initial margin: 1500 bps = 15% -> ~6.6x leverage, 1000 bps = 10x leverage, 300 bps = 33x
    const initMarginBps = m.config?.initial_margin ?? 1000;
    const maxLeverage = Math.min(50, Math.max(1, Math.round(10000 / initMarginBps)));

    const meta = marketBySymbol(m.symbol);

    return {
      id: m.id,
      perpetualId: m.perpetual_id ?? m.id,
      symbol: m.symbol,
      name: m.name || `${m.symbol} Perp`,
      sizeUnits: m.size_units || m.symbol,
      markPrice: mark,
      lastPrice: last,
      bidPrice: bid,
      askPrice: ask,
      change24hPct: Number(change24hPct.toFixed(2)),
      volume24hAUSD: Math.round(volume24hAUSD),
      openInterest: Number(openInterest.toFixed(2)),
      fundingRateBps: m.funding?.rate ?? 0,
      maxLeverage,
      priceDecimals: pDec,
      sizeDecimals: sDec,
      category: meta?.category,
      volatilityTier: meta?.volatilityTier || (Math.abs(change24hPct) > 10 ? "HOT" : "STEADY"),
      volatilityScore: meta?.volatilityScore ?? (Math.abs(change24hPct) > 10 ? 88 : 42),
    };
  });

  // Synthesize extra testnet tokens if not returned by Perpl context
  const existing = new Set(perplList.map((m) => m.symbol.toUpperCase()));
  const extraConfigs = [
    { symbol: "DOGE", name: "DOGE Perp", defaultPx: 0.095, maxLev: 20, pDec: 4 },
    { symbol: "SUI", name: "SUI Perp", defaultPx: 1.25, maxLev: 20, pDec: 3 },
    { symbol: "AVAX", name: "AVAX Perp", defaultPx: 11.2, maxLev: 25, pDec: 2 },
    { symbol: "LINK", name: "LINK Perp", defaultPx: 14.5, maxLev: 25, pDec: 2 },
    { symbol: "PEPE", name: "PEPE Perp", defaultPx: 0.0000045, maxLev: 15, pDec: 8 },
    { symbol: "BNB", name: "BNB Perp", defaultPx: 790.0, maxLev: 30, pDec: 2 },
    { symbol: "XRP", name: "XRP Perp", defaultPx: 1.55, maxLev: 20, pDec: 4 },
    { symbol: "MON", name: "MON Perp", defaultPx: 0.42, maxLev: 20, pDec: 4 },
    { symbol: "WIF", name: "WIF Perp", defaultPx: 2.45, maxLev: 20, pDec: 4 },
    { symbol: "BONK", name: "BONK Perp", defaultPx: 0.000018, maxLev: 15, pDec: 8 },
    { symbol: "SHIB", name: "SHIB Perp", defaultPx: 0.000014, maxLev: 15, pDec: 8 },
    { symbol: "NEAR", name: "NEAR Perp", defaultPx: 4.85, maxLev: 20, pDec: 3 },
    { symbol: "TIA", name: "TIA Perp", defaultPx: 3.6, maxLev: 20, pDec: 3 },
    { symbol: "APT", name: "APT Perp", defaultPx: 6.2, maxLev: 20, pDec: 3 },
    { symbol: "ARB", name: "ARB Perp", defaultPx: 0.55, maxLev: 20, pDec: 4 },
    { symbol: "OP", name: "OP Perp", defaultPx: 1.45, maxLev: 20, pDec: 3 },
    { symbol: "PYTH", name: "PYTH Perp", defaultPx: 0.35, maxLev: 20, pDec: 4 },
    { symbol: "ADA", name: "ADA Perp", defaultPx: 0.75, maxLev: 20, pDec: 4 },
    { symbol: "DOT", name: "DOT Perp", defaultPx: 4.3, maxLev: 20, pDec: 3 },
    { symbol: "LTC", name: "LTC Perp", defaultPx: 88.5, maxLev: 25, pDec: 2 },
    { symbol: "BCH", name: "BCH Perp", defaultPx: 360.0, maxLev: 25, pDec: 2 },
  ];

  for (let i = 0; i < extraConfigs.length; i++) {
    const c = extraConfigs[i]!;
    if (existing.has(c.symbol)) continue;
    const meta = marketBySymbol(c.symbol);
    perplList.push({
      id: 9100 + i,
      perpetualId: 9100 + i,
      symbol: c.symbol,
      name: c.name,
      sizeUnits: c.symbol,
      markPrice: c.defaultPx,
      lastPrice: c.defaultPx,
      bidPrice: c.defaultPx * 0.9995,
      askPrice: c.defaultPx * 1.0005,
      change24hPct: meta?.volatilityTier === "HOT" ? 8.45 : 2.14,
      volume24hAUSD: 184500,
      openInterest: 6420,
      fundingRateBps: 1,
      maxLeverage: c.maxLev,
      priceDecimals: c.pDec,
      sizeDecimals: 2,
      category: meta?.category,
      volatilityTier: meta?.volatilityTier || "MODERATE",
      volatilityScore: meta?.volatilityScore ?? 55,
    });
  }

  return perplList;
}

export const PERPL_EXCHANGE_ABI = [
  "function createAccount(uint256 collateralAmount) external returns (uint64 accountId)",
  "function deposit(uint64 accountId, uint256 amount) external",
  "function withdraw(uint64 accountId, uint256 amount) external",
  "function allowOrderForwarding(bool allowed) external",
  "function getAccount(uint64 accountId) external view returns (tuple(address owner, uint256 collateral, int256 pnl))",
];

export function getPerplExchangeContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const dep = loadDeployment();
  const exchangeAddr = dep.perpl?.exchange || PERPL_TESTNET.exchange;
  return new Contract(exchangeAddr, PERPL_EXCHANGE_ABI, signerOrProvider);
}

/**
 * Fetch Perpl DEX mark price for a symbol (e.g. "BTC", "ETH", "SOL").
 * Returns a Pyth-compatible int64 price with expo = -8 (8 decimal places).
 * e.g. BTC mark $84850.40 → 8485040000000n
 */
export async function fetchPerplMarkPrice(symbol: string): Promise<{ price: bigint; expo: number; markUsd: number }> {
  const markets = await getPerplMarkets();
  const sym = symbol.toUpperCase();
  const found = markets.find((m) => m.symbol.toUpperCase() === sym);
  if (!found) throw new Error(`Perpl market not found for symbol: ${symbol}`);
  
  const markUsd = found.markPrice;
  // Convert to int64 with expo=-8 (same as Pyth format)
  const expo = -8;
  const price = BigInt(Math.round(markUsd * 1e8));
  return { price, expo, markUsd };
}
