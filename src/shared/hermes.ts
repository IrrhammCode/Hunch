import { HERMES } from "../../config/addresses";
import { loadEnv } from "./chain";

export type HermesPriceUpdate = {
  binaryUpdates: string[];
  price: bigint;
  conf: bigint;
  expo: number;
  publishTime: number;
};

function authHeaders(): Record<string, string> {
  loadEnv();
  const key = process.env.PYTH_API_KEY;
  if (!key) {
    throw new Error("Missing PYTH_API_KEY — https://terminal.pyth.network");
  }
  return { Authorization: `Bearer ${key}`, Accept: "application/json" };
}

export async function fetchLatestPriceUpdate(feedId: string): Promise<HermesPriceUpdate> {
  const id = feedId.startsWith("0x") ? feedId.slice(2) : feedId;
  const base = process.env.HERMES_URL || HERMES.baseUrl;
  const url = `${base}/v2/updates/price/latest?ids[]=${id}&encoding=hex`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Hermes latest (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as any;
  const chunks: string[] = json.binary?.data ?? [];
  const parsed = json.parsed?.[0]?.price;
  if (!chunks.length || !parsed) throw new Error("Hermes empty latest");
  return {
    binaryUpdates: chunks.map((c) => (c.startsWith("0x") ? c : `0x${c}`)),
    price: BigInt(parsed.price),
    conf: BigInt(parsed.conf),
    expo: parsed.expo,
    publishTime: parsed.publish_time,
  };
}

export async function fetchPriceUpdateAt(
  feedId: string,
  publishTime: number,
  windowSec = 5
): Promise<HermesPriceUpdate> {
  const id = feedId.startsWith("0x") ? feedId.slice(2) : feedId;
  const base = process.env.HERMES_URL || HERMES.baseUrl;
  let lastErr: Error | null = null;
  for (let t = publishTime; t <= publishTime + windowSec; t++) {
    const url = `${base}/v2/updates/price/${t}?ids[]=${id}&encoding=hex`;
    try {
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) {
        lastErr = new Error(`Hermes ${t} (${res.status})`);
        continue;
      }
      const json = (await res.json()) as any;
      const chunks: string[] = json.binary?.data ?? [];
      const parsed = json.parsed?.[0]?.price;
      if (!chunks.length || !parsed) {
        lastErr = new Error(`Hermes ${t} empty`);
        continue;
      }
      return {
        binaryUpdates: chunks.map((c) => (c.startsWith("0x") ? c : `0x${c}`)),
        price: BigInt(parsed.price),
        conf: BigInt(parsed.conf),
        expo: parsed.expo,
        publishTime: parsed.publish_time,
      };
    } catch (e) {
      lastErr = e as Error;
    }
  }
  throw lastErr ?? new Error("No historical update");
}
