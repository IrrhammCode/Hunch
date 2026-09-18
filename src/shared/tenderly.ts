/**
 * Tenderly simulation (Metropolis perk — Pro license).
 * Dry-run txs before burning testnet gas.
 *
 * API: POST https://api.tenderly.co/api/v1/account/{account}/project/{project}/simulate
 * Auth: X-Access-Key header
 * Env: TENDERLY_ACCOUNT, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY
 */
import { sponsorEnv, tenderlyConfigured, tenderlyTxUrl } from "./sponsors";

export type TenderlySimRequest = {
  networkId?: string | number;
  from: string;
  to: string;
  input?: string;
  data?: string;
  value?: string;
  gas?: number;
  save?: boolean;
  simulationType?: "quick" | "full";
};

export type TenderlySimResult = {
  configured: boolean;
  ok: boolean;
  status?: number;
  body?: any;
  error?: string;
  tenderlyUrl?: string;
};

export async function simulateOnTenderly(req: TenderlySimRequest): Promise<TenderlySimResult> {
  if (!tenderlyConfigured()) {
    return {
      configured: false,
      ok: false,
      error:
        "Tenderly not configured. Set TENDERLY_ACCOUNT, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY in root .env",
    };
  }
  const e = sponsorEnv();
  const url = `https://api.tenderly.co/api/v1/account/${e.tenderlyAccount}/project/${e.tenderlyProject}/simulate`;
  const payload = {
    network_id: String(req.networkId ?? 10143),
    from: req.from,
    to: req.to,
    input: req.input || req.data || "0x",
    gas: req.gas ?? 2_000_000,
    // default gas price 0 for testnet forks
    gas_price: "0",
    value: req.value || "0x0",
    save: req.save ?? true,
    simulation_type: req.simulationType || "full",
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Key": e.tenderlyAccessKey,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
    const simId =
      body?.simulation?.id ||
      body?.simulation?.simulation_id ||
      body?.id ||
      body?.simulation_id;
    return {
      configured: true,
      ok: res.ok,
      status: res.status,
      body,
      error: res.ok ? undefined : body?.error?.message || body?.error || `HTTP ${res.status}`,
      tenderlyUrl: simId
        ? `${e.tenderlyAccount && e.tenderlyProject ? `https://dashboard.tenderly.co/account/${e.tenderlyAccount}/project/${e.tenderlyProject}/simulator/${simId}` : tenderlyTxUrl(simId)}`
        : undefined,
    };
  } catch (e: any) {
    return {
      configured: true,
      ok: false,
      error: e?.message || String(e),
    };
  }
}

/** Simulate a raw tx hash by loading it? Prefer call simulation with calldata. */
export function parseSimStatus(result: TenderlySimResult) {
  const status = result.body?.simulation?.status;
  return {
    passed: result.ok && (status === true || status === "true" || status === undefined),
    rawStatus: status,
  };
}
