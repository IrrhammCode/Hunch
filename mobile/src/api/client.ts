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

export type DemoPosition = {
  roundId: string;
  market: string;
  yes: string;
  no: string;
  status: "open" | "resolved";
  yesWins?: boolean;
  redeemable: boolean;
  estimatedPayout: string;
};

export type DemoMe = {
  address: string;
  ausd: string;
  mon: string;
  roundCount: number;
  positions: DemoPosition[];
  explorer: string;
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

export function fetchDemoMe() {
  return get<DemoMe>("/v1/demo/me");
}

export function demoTrade(side: "UP" | "DOWN", amountAUSD = "10") {
  return post<DemoTradeResult>("/v1/demo/trade", { side, amountAUSD });
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

export function demoRedeem(roundId: string) {
  return post<{ payout: string; tx: string; sideWon: string }>("/v1/demo/redeem", { roundId });
}

export function demoFaucet(amountAUSD = "1000") {
  return post<{ ausd: string; tx: string }>("/v1/demo/faucet", { amountAUSD });
}

export { API_URL };
