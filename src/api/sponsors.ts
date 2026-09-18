/**
 * Tenderly + Zerion debug/portfolio routes (builder perks).
 */
import { Hono } from "hono";
import { ethers } from "ethers";
import { perkStatus, tenderlyConfigured } from "../shared/sponsors";
import { simulateOnTenderly, parseSimStatus } from "../shared/tenderly";
import { fetchZerionPortfolio, fetchZerionPositions } from "./zerion";
import { ausdContract, getProvider, getWallet, loadDeployment } from "../shared/chain";

export const sponsorsApp = new Hono();

sponsorsApp.get("/v1/sponsors/status", (c) => c.json(perkStatus()));

/** Zerion multi-chain portfolio for a wallet */
sponsorsApp.get("/v1/zerion/portfolio/:address", async (c) => {
  const address = c.req.param("address");
  if (!ethers.isAddress(address)) return c.json({ error: "bad address" }, 400);
  return c.json(await fetchZerionPortfolio(address));
});

sponsorsApp.get("/v1/zerion/positions/:address", async (c) => {
  const address = c.req.param("address");
  if (!ethers.isAddress(address)) return c.json({ error: "bad address" }, 400);
  return c.json(await fetchZerionPositions(address));
});

/**
 * Simulate a contract call on Tenderly before sending onchain.
 * Body: { to, data, from?, value?, networkId? }
 */
sponsorsApp.post("/v1/tenderly/simulate", async (c) => {
  const body = await c.req.json<{
    to?: string;
    data?: string;
    input?: string;
    from?: string;
    value?: string;
    networkId?: number;
    kind?: "raw" | "ausd-approve" | "note";
  }>();
  const dep = loadDeployment();
  const provider = getProvider();
  const wallet = getWallet();

  let to = body.to || dep.collateral.address;
  let data = body.data || body.input || "0x";
  let from = body.from || wallet.address;

  if (!ethers.isAddress(to) || !ethers.isAddress(from)) {
    return c.json({ error: "bad from/to" }, 400);
  }

  // Convenience: simulate AUSD faucet mint to a target
  if (body.kind === "ausd-approve" && body.to) {
    to = dep.collateral.address;
    data = ausdContract(provider).interface.encodeFunctionData("mint", [
      body.to,
      ethers.parseUnits("100", 6),
    ]);
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
    // keep payload small — full body available in Tenderly UI
    simulationId: sim.body?.simulation?.id || sim.body?.simulation?.simulation_id || null,
  });
});
