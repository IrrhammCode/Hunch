import { ethers, Contract } from "ethers";
import { getProvider, loadDeployment } from "./chain";

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

  return markets.map((m: any) => {
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
    };
  });
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
