/**
 * Perpl authenticated API (Ed25519 signed requests + trading WS).
 * Docs: https://docs.perpl.xyz/resources/for-developers/api/authentication.md
 *
 * Env:
 *   PERPL_API_URL (default testnet https://testnet.perpl.xyz/api)
 *   PERPL_WS_URL  (default wss://testnet.perpl.xyz)
 *   PERPL_CHAIN_ID (default 10143)
 *   PERPL_API_KEY        — X-API-Key token
 *   PERPL_API_KEY_SECRET — hex 32-byte Ed25519 private key
 */
import { createHash, randomBytes } from "crypto";
import * as ed from "@noble/ed25519";
import { loadEnv } from "./chain";

export function perplEnv() {
  loadEnv();
  return {
    apiUrl: process.env.PERPL_API_URL || "https://testnet.perpl.xyz/api",
    wsUrl: process.env.PERPL_WS_URL || "wss://testnet.perpl.xyz",
    chainId: Number(process.env.PERPL_CHAIN_ID || 10143),
    apiKey: process.env.PERPL_API_KEY || "",
    apiSecret: (process.env.PERPL_API_KEY_SECRET || "").replace(/^0x/, ""),
  };
}

export function perplAuthConfigured() {
  const e = perplEnv();
  return Boolean(e.apiKey && e.apiSecret.length >= 64);
}

function privKeyBytes() {
  const hex = perplEnv().apiSecret;
  return Buffer.from(hex, "hex");
}

async function signCanonical(canonical: string) {
  const sig = await ed.signAsync(Buffer.from(canonical), privKeyBytes());
  return Buffer.from(sig).toString("base64url");
}

/** Signed REST request to Perpl. target = path + query exactly as sent. */
export async function perplSignedFetch(
  method: "GET" | "POST",
  target: string,
  body?: unknown,
) {
  const e = perplEnv();
  if (!perplAuthConfigured()) {
    throw new Error(
      "Perpl API keys missing. Set PERPL_API_KEY + PERPL_API_KEY_SECRET in root .env (https://testnet.perpl.xyz/apikeys)",
    );
  }
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("base64url");
  const bodyStr = body == null ? "" : JSON.stringify(body);
  const bodyHash = createHash("sha256").update(bodyStr).digest("hex");
  const canonical = [e.chainId, method, target, timestamp, nonce, bodyHash].join("\n");
  const signature = await signCanonical(canonical);

  return fetch(`${e.apiUrl}${target}`, {
    method,
    headers: {
      "X-API-Key": e.apiKey,
      "X-API-Timestamp": timestamp,
      "X-API-Nonce": nonce,
      "X-API-Signature": signature,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: bodyStr } : {}),
  });
}

export type PerplWsOrderInput = {
  /** On-chain account id from createAccount */
  accountId: number;
  marketId: number;
  side: "LONG" | "SHORT";
  /** Human size in asset units (e.g. BTC) */
  size: number;
  sizeDecimals: number;
  leverage: number;
  /** 0 = market IOC; scaled limit price optional */
  limitPriceScaled?: number;
  lastExecutionBlock?: number;
};

/**
 * Place order on Perpl trading WS (mt: 22 OrderRequest).
 * Requires on-chain exchange account + trade-scoped API key.
 */
export async function placePerplOrderWs(input: PerplWsOrderInput): Promise<{
  accepted: boolean;
  code?: number;
  error?: string;
  raw?: any;
}> {
  const e = perplEnv();
  if (!perplAuthConfigured()) {
    throw new Error(
      "Perpl trading requires PERPL_API_KEY + PERPL_API_KEY_SECRET (scope trade). Enroll at testnet.perpl.xyz/apikeys",
    );
  }

  const WebSocketImpl = (globalThis as any).WebSocket || (await import("ws")).default;
  const url = `${e.wsUrl}/ws/v1/trading`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocketImpl(url);
    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* noop */
      }
      reject(new Error("Perpl WS timeout"));
    }, 20000);

    let sn = 1;
    let rq = 1;

    ws.onopen = async () => {
      try {
        const timestamp = Date.now().toString();
        const nonce = randomBytes(16).toString("base64url");
        const canonical = [e.chainId, "trading-ws-signin", timestamp, nonce].join("\n");
        const signature = await signCanonical(canonical);
        ws.send(
          JSON.stringify({
            mt: 29,
            chain_id: e.chainId,
            api_key: e.apiKey,
            timestamp,
            nonce,
            signature,
          }),
        );
      } catch (err: any) {
        clearTimeout(timeout);
        reject(err);
      }
    };

    ws.onmessage = (event: any) => {
      let msg: any = null;
      try {
        msg = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
      } catch {
        return;
      }

      if (msg?.mt === 19) {
        // WalletSnapshot — seed account id + last request id if present
        const accs = msg?.d?.accs || msg?.d?.accounts || [];
        const first = Array.isArray(accs) && accs[0];
        if (first?.lfr != null) rq = Number(first.lfr) + 1;
        const accountId =
          input.accountId || (first?.id != null ? Number(first.id) : 0);
        if (!accountId) {
          clearTimeout(timeout);
          try {
            ws.close();
          } catch {
            /* noop */
          }
          reject(
            new Error(
              "No Perpl on-chain account. Call createAccount on Exchange with AUSD (min ~100) first.",
            ),
          );
          return;
        }

        const sizeScaled = Math.max(
          1,
          Math.round(input.size * Math.pow(10, input.sizeDecimals || 2)),
        );
        const order = {
          mt: 22,
          sn: sn++,
          rq: rq++,
          mkt: input.marketId,
          acc: accountId,
          t: input.side === "LONG" ? 1 : 2,
          p: input.limitPriceScaled ?? 0,
          s: sizeScaled,
          fl: input.limitPriceScaled ? 0 : 4, // IOC if market
          lv: Math.round(input.leverage * 100),
          lb: input.lastExecutionBlock || 0,
        };
        ws.send(JSON.stringify(order));
      }

      if (msg?.mt === 3 && msg?.sid === 100) {
        clearTimeout(timeout);
        const code = msg?.status?.code;
        try {
          ws.close();
        } catch {
          /* noop */
        }
        if (code === 0) {
          resolve({ accepted: true, code, raw: msg });
        } else {
          resolve({
            accepted: false,
            code,
            error: msg?.status?.error || `Perpl gateway code ${code}`,
            raw: msg,
          });
        }
      }
    };

    ws.onerror = (err: any) => {
      clearTimeout(timeout);
      reject(new Error(err?.message || "Perpl WS error"));
    };
  });
}

export async function perplFetchFills(count = 20) {
  const target = `/v1/trading/fills?count=${count}`;
  const res = await perplSignedFetch("GET", target);
  return res.json();
}

export async function perplFetchPositionHistory(count = 20) {
  const target = `/v1/trading/position-history?count=${count}`;
  const res = await perplSignedFetch("GET", target);
  return res.json();
}
