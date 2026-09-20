/**
 * Live Quicknode / Monad RPC preflight.
 * Usage: npm run rpc:check
 * Prints chainId, block number, latency, host (token never printed in full).
 */
import { loadEnv } from "../src/shared/chain";
import {
  isQuicknodeUrl,
  maskRpcUrl,
  monadRpcSurface,
  resolveMonadRpcUrl,
} from "../src/shared/rpc";

async function probe(url: string, label: string) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    const j = (await res.json()) as { result?: string; error?: { message?: string } };
    const ms = Date.now() - t0;
    const chainId = j.result ? parseInt(j.result, 16) : null;
    const ok = res.ok && chainId === 10143;
    console.log(
      `${ok ? "OK " : "FAIL"} ${label.padEnd(8)} ${maskRpcUrl(url)} chainId=${chainId ?? "?"} ${ms}ms${
        j.error?.message ? ` · ${j.error.message}` : ""
      }${isQuicknodeUrl(url) ? " · Quicknode" : ""}`,
    );
    return ok;
  } catch (e: any) {
    console.log(`FAIL ${label.padEnd(8)} ${maskRpcUrl(url)} · ${e?.message || e}`);
    return false;
  }
}

async function blockNumber(url: string) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 2 }),
      signal: AbortSignal.timeout(8000),
    });
    const j = (await res.json()) as { result?: string };
    return j.result ? parseInt(j.result, 16) : null;
  } catch {
    return null;
  }
}

async function main() {
  loadEnv();
  const s = monadRpcSurface();
  console.log("\nHunch RPC check (Quicknode maximize)\n");
  console.log(`Primary MONAD_RPC_URL: ${maskRpcUrl(s.monadRpcUrl || "(unset)")}`);
  console.log(`Quicknode endpoints configured: ${s.quicknodeEndpoints}`);
  console.log(`Surfaces QN: api=${isQuicknodeUrl(s.resolved.api)} keeper=${isQuicknodeUrl(s.resolved.keeper)} indexer=${isQuicknodeUrl(s.resolved.indexer)} hardhat=${isQuicknodeUrl(s.resolved.hardhat)}`);

  const roles = [
    ["api", resolveMonadRpcUrl("api")],
    ["keeper", resolveMonadRpcUrl("keeper")],
    ["indexer", resolveMonadRpcUrl("indexer")],
    ["hardhat", resolveMonadRpcUrl("hardhat")],
  ] as const;

  console.log("");
  let allOk = true;
  for (const [label, url] of roles) {
    const ok = await probe(url, label);
    if (!ok) allOk = false;
  }

  const bn = await blockNumber(resolveMonadRpcUrl("api"));
  console.log(`\nLatest block (api role): ${bn ?? "unavailable"}`);
  console.log(
    allOk
      ? "\nAll roles respond on Monad testnet 10143.\n"
      : "\nSome RPC roles failed — check Quicknode token / endpoint network (must be Testnet).\n",
  );
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
