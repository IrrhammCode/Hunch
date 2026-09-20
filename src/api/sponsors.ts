/**
 * Tenderly + Zerion routes — real APIs only. No mint/mock simulation.
 * Missing Tenderly keys → 503 with clear error (keys still being claimed).
 */
import { Hono } from "hono";
import { ethers } from "ethers";
import { perkStatus, tenderlyConfigured } from "../shared/sponsors";
import { simulateOnTenderly, parseSimStatus } from "../shared/tenderly";
import { fetchZerionPortfolio, fetchZerionPositions } from "./zerion";
import { getProvider, getWallet, loadDeployment } from "../shared/chain";

export const sponsorsApp = new Hono();

sponsorsApp.get("/v1/sponsors/status", (c) => c.json(perkStatus()));

/** Zerion multi-chain portfolio for a wallet */
sponsorsApp.get("/v1/zerion/portfolio/:address", async (c) => {
  const address = c.req.param("address");
  if (!ethers.isAddress(address)) return c.json({ error: "bad address" }, 400);
  try {
    return c.json(await fetchZerionPortfolio(address));
  } catch (e: any) {
    return c.json({ error: e?.message || String(e), configured: false }, 503);
  }
});

sponsorsApp.get("/v1/zerion/positions/:address", async (c) => {
  const address = c.req.param("address");
  if (!ethers.isAddress(address)) return c.json({ error: "bad address" }, 400);
  try {
    return c.json(await fetchZerionPositions(address));
  } catch (e: any) {
    return c.json({ error: e?.message || String(e), configured: false }, 503);
  }
});

/**
 * Real Tenderly simulate (no mock fallback).
 * Body: { to, data, from?, value?, networkId? }
 * kind "agora-faucet" simulates official faucet requestFunds (not MockAUSD mint).
 */
sponsorsApp.post("/v1/tenderly/simulate", async (c) => {
  if (!tenderlyConfigured()) {
    return c.json(
      {
        configured: false,
        ok: false,
        error:
          "Tenderly keys not ready. Set real TENDERLY_ACCOUNT / TENDERLY_PROJECT / TENDERLY_ACCESS_KEY in root .env (placeholders rejected).",
      },
      503,
    );
  }

  const body = await c.req.json<{
    to?: string;
    data?: string;
    input?: string;
    from?: string;
    value?: string;
    networkId?: number;
    kind?: "raw" | "agora-faucet";
  }>();
  const dep = loadDeployment();
  const provider = getProvider();
  const wallet = getWallet();

  let to = body.to || dep.collateral.address;
  let data = body.data || body.input || "0x";
  const from = body.from || wallet.address;

  if (!ethers.isAddress(to) || !ethers.isAddress(from)) {
    return c.json({ error: "bad from/to" }, 400);
  }

  // Official Agora faucet — requestFunds(address), never MockAUSD.mint
  if (body.kind === "agora-faucet") {
    const recipient = body.to || from;
    if (!ethers.isAddress(recipient)) return c.json({ error: "bad recipient" }, 400);
    const faucetAddr =
      (dep.collateral as any).faucet || "0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C";
    const iface = new ethers.Interface([
      "function requestFunds(address recipient) external returns (bool)",
    ]);
    to = faucetAddr;
    data = iface.encodeFunctionData("requestFunds", [recipient]);
  }

  const sim = await simulateOnTenderly({
    networkId: body.networkId ?? dep.chainId ?? 10143,
    from,
    to,
    data,
    value: body.value,
    save: true,
  });
  const status = parseSimStatus(sim);
  return c.json({
    configured: sim.configured,
    ok: sim.ok,
    passed: status.passed,
    tenderlyUrl: sim.tenderlyUrl,
    error: sim.error,
    status: sim.status,
    simulationId: sim.body?.simulation?.id || sim.body?.simulation?.simulation_id || null,
  });
});
