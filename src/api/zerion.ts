/**
 * Zerion API — wallet portfolio / positions (Metropolis perk).
 * Auth: HTTP Basic — username = API key, password empty.
 * Env: ZERION_API_KEY
 * https://developers.zerion.io
 */
import { sponsorEnv, zerionConfigured } from "../shared/sponsors";

const BASE = "https://api.zerion.io";

function authHeader() {
  const key = sponsorEnv().zerionApiKey;
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function zerionGet(path: string) {
  if (!zerionConfigured()) {
    return {
      configured: false as const,
      error: "ZERION_API_KEY not set in root .env (dashboard.zerion.io)",
    };
  }
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        Authorization: authHeader(),
        accept: "application/json",
      },
    });
    const json = (await res.json()) as any;
    if (!res.ok) {
      return {
        configured: true as const,
        error: json?.errors?.[0]?.detail || `Zerion HTTP ${res.status}`,
      };
    }
    return { configured: true as const, data: json };
  } catch (e: any) {
    return { configured: true as const, error: e?.message || String(e) };
  }
}

export type ZerionPortfolio = {
  address: string;
  configured: boolean;
  totalUSD: number | null;
  change1dUSD: number | null;
  change1dPct: number | null;
  byChain: Record<string, number>;
  byType: Record<string, number>;
  raw?: any;
  error?: string;
};

export async function fetchZerionPortfolio(address: string): Promise<ZerionPortfolio> {
  const empty: ZerionPortfolio = {
    address,
    configured: false,
    totalUSD: null,
    change1dUSD: null,
    change1dPct: null,
    byChain: {},
    byType: {},
  };
  if (!address) return { ...empty, error: "address required" };

  const res = await zerionGet(
    `/v1/wallets/${address}/portfolio?currency=usd&filter[positions]=only_simple`,
  );
  if ("error" in res && res.error) {
    return { ...empty, configured: res.configured, error: res.error };
  }

  const attrs = (res as any).data?.data?.attributes;
  const total = attrs?.total?.positions;
  const byChain = attrs?.positions_distribution_by_chain || {};
  const byType = attrs?.positions_distribution_by_type || {};
  const changes = attrs?.changes || {};

  return {
    address,
    configured: true,
    totalUSD: typeof total === "number" ? total : null,
    change1dUSD: typeof changes.absolute_1d === "number" ? changes.absolute_1d : null,
    change1dPct: typeof changes.percent_1d === "number" ? changes.percent_1d * 100 : null,
    byChain,
    byType,
  };
}

export type ZerionToken = {
  symbol: string;
  name?: string;
  chain?: string;
  quantity: number;
  valueUSD: number | null;
};

export async function fetchZerionPositions(address: string): Promise<{
  configured: boolean;
  tokens: ZerionToken[];
  error?: string;
}> {
  if (!address) return { configured: false, tokens: [], error: "address required" };
  const res = await zerionGet(
    `/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_simple&sort=-value`,
  );
  if ("error" in res && res.error) {
    return { configured: res.configured, tokens: [], error: res.error };
  }
  const list = (res as any).data?.data || [];
  const tokens: ZerionToken[] = list.slice(0, 12).map((row: any) => {
    const a = row?.attributes || {};
    const fungible = a?.fungible_info?.implementation || {};
    const balance = Number(a?.quantity?.numeric || 0);
    const value = a?.value?.positions;
    return {
      symbol: fungible?.symbol || a?.fungible_info?.symbol || "?",
      name: a?.fungible_info?.name,
      chain: a?.chain || fungible?.chain,
      quantity: balance,
      valueUSD: typeof value === "number" ? value : null,
    };
  });
  return { configured: true, tokens };
}

export { zerionConfigured };
