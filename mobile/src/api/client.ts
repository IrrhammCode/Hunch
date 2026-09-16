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

export function fetchCurrentRound() {
  return get<CurrentRoundResponse>("/v1/round/current");
}

export function fetchRound(id: string) {
  return get<{
    round: {
      roundId: string;
      status: "open" | "resolved";
      yesWins?: boolean;
    } | null;
  }>(`/v1/round/${id}`);
}

export function fetchConfig() {
  return get<{ chainId: number; duration: number; vault: string | null }>("/v1/config");
}

/** Shared demo hot-wallet snapshot (local testing only). */
export function fetchDemoMe() {
  return get<WalletSnapshot>("/v1/demo/me");
}

/** Balances + positions for any wallet (Privy embedded address). */
export function fetchWallet(address: string) {
  return get<WalletSnapshot>(`/v1/wallet/${address}`);
}

export function walletFaucet(address: string, amountAUSD = "1000") {
  return post<FaucetResult>("/v1/wallet/faucet", { address, amountAUSD });
}

export function fetchCommitCalldata(side: "UP" | "DOWN" | "YES" | "NO", amountAUSD: string) {
  const normalized = side === "UP" ? "YES" : side === "DOWN" ? "NO" : side;
  return post<CommitCalldata>("/v1/tx/commit", { side: normalized, amountAUSD });
}

export function executeTrade(trader: string, intentId?: string) {
  return post<ExecuteTradeResult>("/v1/trade/execute", { trader, intentId });
}

export function fetchRedeemCalldata(market?: string) {
  return post<{ to: string; data: string; value: string; description: string }>("/v1/tx/redeem", {
    market,
  });
}

export function fetchQuote(side: "YES" | "NO", amountAUSD: string, market?: string) {
  return post<{
    side: string;
    amountIn: string;
    feeAUSD: string;
    sharesOut: string;
    note?: string;
  }>("/v1/quote", { side, amountAUSD, market });
}

/** Demo path — server hot wallet executes trade. */
export function demoTrade(side: "UP" | "DOWN", amountAUSD = "10") {
  return post<DemoTradeResult>("/v1/demo/trade", { side, amountAUSD });
}

export function demoRedeem(roundId: string) {
  return post<{ payout: string; tx: string; sideWon: string }>("/v1/demo/redeem", { roundId });
}

export function demoFaucet(amountAUSD = "1000") {
  return post<{ ausd: string; tx: string }>("/v1/demo/faucet", { amountAUSD });
}

export { API_URL };
