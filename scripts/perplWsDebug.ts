/**
 * Debug Perpl trading WS: log every frame, no silent timeout.
 * Usage: npx ts-node scripts/perplWsDebug.ts
 */
import { createHash, randomBytes } from "crypto";
import * as ed from "@noble/ed25519";
import WebSocket from "ws";
import { loadEnv } from "../src/shared/chain";
import { perplEnv, perplAuthConfigured } from "../src/shared/perplAuth";

loadEnv();

async function main() {
  const e = perplEnv();
  console.log("[ws-debug] auth", perplAuthConfigured(), "url", `${e.wsUrl}/ws/v1/trading`);
  console.log("[ws-debug] key prefix", e.apiKey.slice(0, 8), "secret len", e.apiSecret.length);

  const priv = Buffer.from(e.apiSecret, "hex");
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("base64url");
  const canonical = [e.chainId, "trading-ws-signin", timestamp, nonce].join("\n");
  const sig = await ed.signAsync(Buffer.from(canonical), priv);
  const signature = Buffer.from(sig).toString("base64url");
  const bodyHash = createHash("sha256").update("").digest("hex");
  console.log("[ws-debug] canonical", JSON.stringify(canonical));
  console.log("[ws-debug] bodyHash", bodyHash);

  const url = `${e.wsUrl}/ws/v1/trading`;
  const ws = new WebSocket(url);
  const t0 = Date.now();

  ws.on("open", () => {
    console.log("[ws-debug] open", Date.now() - t0, "ms");
    const msg = {
      mt: 29,
      chain_id: e.chainId,
      api_key: e.apiKey,
      timestamp,
      nonce,
      signature,
    };
    console.log("[ws-debug] send signin", JSON.stringify(msg).slice(0, 200));
    ws.send(JSON.stringify(msg));
  });

  ws.on("message", (data) => {
    const s = typeof data === "string" ? data : data.toString();
    console.log("[ws-debug] msg +", Date.now() - t0, "ms", s.slice(0, 500));
  });

  ws.on("error", (err) => {
    console.error("[ws-debug] error", err);
  });

  ws.on("close", (code, reason) => {
    console.log("[ws-debug] close", code, reason?.toString());
    process.exit(0);
  });

  setTimeout(() => {
    console.log("[ws-debug] timeout 15s — closing");
    try {
      ws.close();
    } catch {
      /* noop */
    }
    process.exit(1);
  }, 15000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
