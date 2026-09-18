import { DESIGN_MODE } from "../config/chain";
import { mockApi } from "../mock/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || `${path} → ${res.status}`);
  return json;
}

async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || `${path} → ${res.status}`);
  return json;
}

export type CurrentRoundResponse = {
  round: {
    roundId: string;
    market: string;
    strike: string;
    expo: number;
    startTime: number;
    expiry: number;
    status: "open" | "resolved";
    yesWins?: boolean;
  } | null;
  spot?: { yes: string; no: string };
  timeRemaining?: number;
  error?: string;
};

export type WalletPosition = {
  roundId: string;
  market: string;
  yes: string;
  no: string;
  status: "open" | "resolved";
  yesWins?: boolean;
  redeemable: boolean;
  estimatedPayout: string;
};

export type WalletSnapshot = {
  address: string;
  ausd: string;
  mon: string;
  roundCount: number;
  positions: WalletPosition[];
  explorer: string;
};

export type DemoTradeResult = {
  mode: string;
  trader: string;
  roundId: string;
  market: string;
  side: string;
  amountAUSD: string;
  yes: string;
  no: string;
  executeTx: string;
  spot: { yes: string; no: string };
};

export type CommitCalldata = {
  chainId: number;
  market: string;
  collateral: string;
  approve: { to: string; data: string; value: string };
  commit: { to: string; data: string; value: string; description: string };
};

export type ExecuteTradeResult = {
  mode: string;
  intentId: string;
  market: string;
  trader: string;
  side: string;
  sideLabel: string;
  roundId: string;
  amountAUSD: string;
  sharesOut: string;
  yes: string;
  no: string;
  executeTx: string;
  spot: { yes: string; no: string };
  explorer: string;
};

export type FaucetResult = {
  address: string;
  ausd: string;
  mon: string;
  mintTx?: string;
  monTx?: string;
  alreadyFunded?: boolean;
};

export function fetchCurrentRound(symbol?: string) {
  if (DESIGN_MODE) return mockApi.fetchCurrentRound();
  const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
  return get<CurrentRoundResponse>(`/v1/round/current${q}`);
}

export function fetchRound(id: string) {
  if (DESIGN_MODE) return mockApi.fetchRound(id);
  return get<{
    round: {
      roundId: string;
      status: "open" | "resolved";
      yesWins?: boolean;
    } | null;
  }>(`/v1/round/${id}`);
}

export function fetchConfig() {
  if (DESIGN_MODE) return mockApi.fetchConfig();
  return get<{
    chainId: number;
    duration: number;
    vault: string | null;
    markets?: { symbol: string; pair: string }[];
    chains?: { key: string; name: string; chainId: number; settlementHub?: boolean }[];
  }>("/v1/config");
}

export type MarketBoardRow = {
  symbol: string;
  pair: string;
  label?: string;
  chain: string;
  chainId: number;
  settlementHub?: boolean;
  status: "open" | "resolved" | "waiting" | "unavailable";
  roundId: string | null;
  market: string | null;
  timeRemaining?: number;
  strike?: string;
  spot?: { yes: string; no: string };
  reason?: string;
  explorer?: string;
};

export type MarketBoard = {
  product: string;
  feature: string;
  settlement: string;
  chains: {
    key: string;
    name: string;
    chainId: number;
    settlementHub?: boolean;
    deployed?: boolean;
    explorer?: string;
  }[];
  markets: MarketBoardRow[];
};

export function fetchMarketBoard(chain?: string) {
  if (DESIGN_MODE) return mockApi.fetchMarketBoard(chain);
  const q = chain ? `?chain=${encodeURIComponent(chain)}` : "";
  return get<MarketBoard>(`/v1/markets${q}`);
}

export type CrossChainBook = {
  address: string;
  model: string;
  chains: {
    chain: string;
    chainName?: string;
    chainId: number;
    available?: boolean;
    settlementHub?: boolean;
    address?: string;
    ausd?: string;
    mon?: string;
    positions?: WalletPosition[];
    explorer?: string;
    error?: string;
    note?: string;
  }[];
};

export function fetchCrossChainBook(address: string) {
  if (DESIGN_MODE) return mockApi.fetchCrossChainBook(address);
  return get<CrossChainBook>(`/v1/book/${address}`);
}

/** Shared demo hot-wallet snapshot (local testing only). */
export function fetchDemoMe() {
  if (DESIGN_MODE) return mockApi.fetchDemoMe();
  return get<WalletSnapshot>("/v1/demo/me");
}

/** Balances + positions for any wallet (Privy embedded address). */
export function fetchWallet(address: string) {
  if (DESIGN_MODE) return mockApi.fetchWallet(address);
  return get<WalletSnapshot>(`/v1/wallet/${address}`);
}

export function walletFaucet(address: string, amountAUSD = "1000") {
  if (DESIGN_MODE) return mockApi.walletFaucet(address, amountAUSD);
  return post<FaucetResult>("/v1/wallet/faucet", { address, amountAUSD });
}

export function fetchCommitCalldata(
  side: "UP" | "DOWN" | "YES" | "NO",
  amountAUSD: string,
  symbol?: string,
) {
  const normalized = side === "UP" ? "YES" : side === "DOWN" ? "NO" : side;
  if (DESIGN_MODE) return mockApi.fetchCommitCalldata(normalized, amountAUSD);
  return post<CommitCalldata>("/v1/tx/commit", { side: normalized, amountAUSD, symbol });
}

export function executeTrade(trader: string, intentId?: string, market?: string) {
  if (DESIGN_MODE) return mockApi.executeTrade(trader);
  return post<ExecuteTradeResult>("/v1/trade/execute", { trader, intentId, market });
}

export function fetchRedeemCalldata(market?: string) {
  if (DESIGN_MODE) return mockApi.fetchRedeemCalldata(market);
  return post<{ to: string; data: string; value: string; description: string }>("/v1/tx/redeem", {
    market,
  });
}

export function fetchQuote(side: "YES" | "NO", amountAUSD: string, market?: string) {
  if (DESIGN_MODE) return mockApi.fetchQuote(side, amountAUSD);
  return post<{
    side: string;
    amountIn: string;
    feeAUSD: string;
    sharesOut: string;
    note?: string;
  }>("/v1/quote", { side, amountAUSD, market });
}

/** Demo path — server hot wallet executes trade. */
export function demoTrade(side: "UP" | "DOWN", amountAUSD = "10", symbol?: string) {
  if (DESIGN_MODE) return mockApi.demoTrade(side, amountAUSD);
  return post<DemoTradeResult>("/v1/demo/trade", { side, amountAUSD, symbol });
}

export function demoRedeem(roundId: string) {
  if (DESIGN_MODE) return mockApi.demoRedeem(roundId);
  return post<{ payout: string; tx: string; sideWon: string }>("/v1/demo/redeem", { roundId });
}

export function demoFaucet(amountAUSD = "1000") {
  if (DESIGN_MODE) return mockApi.demoFaucet(amountAUSD);
  return post<{ ausd: string; tx: string }>("/v1/demo/faucet", { amountAUSD });
}

export { API_URL };
