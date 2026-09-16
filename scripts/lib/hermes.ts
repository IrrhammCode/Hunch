import { HERMES } from "../../config/addresses";

export type HermesPriceUpdate = {
  binaryUpdates: string[]; // 0x-prefixed VAAs for updatePriceFeeds
  price: bigint;
  conf: bigint;
  expo: number;
  publishTime: number;
};

function authHeaders(): Record<string, string> {
  const key = process.env.PYTH_API_KEY;
  if (!key) {
    throw new Error(
      "Missing PYTH_API_KEY. Create one at https://terminal.pyth.network and set it in .env"
    );
  }
  return {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
}

/**
 * Fetch latest Pyth price update binary for on-chain updatePriceFeeds.
 * @see https://docs.pyth.network/price-feeds/core/fetch-price-updates
 */
export async function fetchLatestPriceUpdate(feedId: string): Promise<HermesPriceUpdate> {
  const id = feedId.startsWith("0x") ? feedId.slice(2) : feedId;
  const url = `${HERMES.baseUrl}/v2/updates/price/latest?ids[]=${id}&encoding=hex`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Hermes latest failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as {
    binary?: { data?: string[] };
    parsed?: Array<{
      price?: { price: string; conf: string; expo: number; publish_time: number };
    }>;
  };

  const chunks = json.binary?.data ?? [];
  if (chunks.length === 0) throw new Error("Hermes returned no binary update data");

  const parsed = json.parsed?.[0]?.price;
  if (!parsed) throw new Error("Hermes returned no parsed price");

  return {
    binaryUpdates: chunks.map((c) => (c.startsWith("0x") ? c : `0x${c}`)),
    price: BigInt(parsed.price),
    conf: BigInt(parsed.conf),
    expo: parsed.expo,
    publishTime: parsed.publish_time,
  };
}

/**
 * Fetch a historical price update near `publishTime` (for resolve).
 * Tries exact timestamp, then nearby seconds.
 */
export async function fetchPriceUpdateAt(
  feedId: string,
  publishTime: number,
  windowSec = 5
): Promise<HermesPriceUpdate> {
  const id = feedId.startsWith("0x") ? feedId.slice(2) : feedId;
  let lastErr: Error | null = null;

  for (let t = publishTime; t <= publishTime + windowSec; t++) {
    const url = `${HERMES.baseUrl}/v2/updates/price/${t}?ids[]=${id}&encoding=hex`;
    try {
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) {
        lastErr = new Error(`Hermes historical ${t} failed (${res.status})`);
        continue;
      }
      const json = (await res.json()) as {
        binary?: { data?: string[] };
        parsed?: Array<{
          price?: { price: string; conf: string; expo: number; publish_time: number };
        }>;
      };
      const chunks = json.binary?.data ?? [];
      const parsed = json.parsed?.[0]?.price;
      if (!chunks.length || !parsed) {
        lastErr = new Error(`Hermes historical ${t} empty`);
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

  throw lastErr ?? new Error("No historical Pyth update in window");
}
