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
import WebSocket from "ws";
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
  return Buffer.from(perplEnv().apiSecret, "hex");
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
  accountId: number;
  marketId: number;
  side: "LONG" | "SHORT";
  size: number;
  sizeDecimals: number;
  leverage: number;
  limitPriceScaled?: number;
  lastExecutionBlock?: number;
};

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

  const url = `${e.wsUrl}/ws/v1/trading`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* noop */
      }
      reject(new Error("Perpl WS timeout — no order ack (check API-key wallet vs createAccount wallet)"));
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
      if (msg?.mt !== 100) {
        console.log("[perpl-ws] recv", JSON.stringify(msg).slice(0, 240));
      }

      if (msg?.mt === 19) {
        // Live Perpl frame: accounts under top-level `as` (or legacy d.accs)
        const accs: any[] =
          msg?.as ||
          msg?.d?.accs ||
          msg?.d?.accounts ||
          msg?.accounts ||
          [];
        const first = Array.isArray(accs) ? accs[0] : null;
        const wsAddr = typeof msg?.addr === "string" ? msg.addr.toLowerCase() : "";
        if (first?.lfr != null) rq = Number(first.lfr) + 1;
        const discoveredId =
          first?.id != null ? Number(first.id) : first?.acc != null ? Number(first.acc) : 0;
        // Trade with the API-key's own account when discovered (key wallet != local link)
        const accountId = discoveredId || input.accountId;
        console.log(
          `[perpl-ws] mt19 addr=${wsAddr} discoveredId=${discoveredId} usingAccountId=${accountId} accs=${accs.length}`,
        );
        if (!accountId) {
          clearTimeout(timeout);
          try {
            ws.close();
          } catch {
            /* noop */
          }
          reject(
            new Error(
              `No Perpl account for API-key wallet ${wsAddr || "?"}. Enroll PERPL key on the same wallet that called createAccount, or POST /v1/perpl/account-link.`,
            ),
          );
          return;
        }

        const sizeDecimals = input.sizeDecimals ?? 2;
        const sizeScaled = Math.max(
          1,
          Math.round(input.size * Math.pow(10, sizeDecimals)),
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
          fl: input.limitPriceScaled ? 0 : 4,
          lv: Math.round(input.leverage * 100),
          lb: input.lastExecutionBlock ?? 0,
        };
        console.log("[perpl-ws] send order", JSON.stringify(order));
        ws.send(JSON.stringify(order));
      }

      if (msg?.mt === 3) {
        clearTimeout(timeout);
        const code = msg?.status?.code ?? msg?.code;
        try {
          ws.close();
        } catch {
          /* noop */
        }
        if (code === 0) {
          resolve({ accepted: true, code: 0, raw: msg });
          return;
        }
        resolve({
          accepted: false,
          code: code ?? -1,
          error: msg?.status?.error || msg?.error || `Perpl gateway code ${code}`,
          raw: msg,
        });
      }

      // Explicit reject frames
      if (msg?.mt === 4 || msg?.error || (msg?.mt === 3 && msg?.status?.code && msg.status.code !== 0)) {
        if (msg?.mt === 3) return; // handled above
        clearTimeout(timeout);
        try {
          ws.close();
        } catch {
          /* noop */
        }
        resolve({
          accepted: false,
          code: msg?.status?.code ?? msg?.code ?? -1,
          error: msg?.error || msg?.status?.error || "Perpl rejected frame",
          raw: msg,
        });
      }
    };

    ws.onerror = (err: any) => {
      clearTimeout(timeout);
      console.error("[perpl-ws] error:", err?.message || err);
      reject(new Error(err?.message || "Perpl WS error"));
    };
  });
}

export async function perplFetchFills(count = 20) {
  return (await perplSignedFetch("GET", `/v1/trading/fills?count=${count}`)).json();
}

export async function perplFetchPositions() {
  return (await perplSignedFetch("GET", "/v1/trading/positions")).json();
}

export async function perplFetchPositionHistory(count = 20) {
  return (
    await perplSignedFetch("GET", `/v1/trading/position-history?count=${count}`)
  ).json();
}

