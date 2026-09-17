/**
 * Safe demo smoke — read-only against a running API.
 * Does NOT trade, faucet, or spend gas.
 *
 * Usage: npm run smoke:demo
 * Env:   SMOKE_API_URL (default http://localhost:8787)
 */
import fs from "fs";
import path from "path";

const BASE = (process.env.SMOKE_API_URL || "http://localhost:8787").replace(/\/$/, "");

type Check = { name: string; ok: boolean; detail: string };

function loadDeployment() {
  const p = path.join(__dirname, "..", "deployments", "monad-testnet.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as {
    chainId: number;
    factory: string;
    vault?: string;
    collateral: { address: string };
  };
}

async function getJson<T>(pathName: string): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE}${pathName}`);
  const body = (await res.json()) as T;
  return { status: res.status, body };
}

function eqAddr(a?: string, b?: string) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

async function main() {
  const checks: Check[] = [];
  const dep = loadDeployment();

  // 1. Health
  try {
    const { status, body } = await getJson<{ ok?: boolean }>("/health");
    const ok = status === 200 && (body.ok === true || body.ok === undefined);
    checks.push({
      name: "API /health",
      ok,
      detail: ok ? `up → ${BASE}` : `status ${status} ${JSON.stringify(body)}`,
    });
  } catch (e: any) {
    checks.push({
      name: "API /health",
      ok: false,
      detail: `unreachable — start npm run api (${e?.message || e})`,
    });
  }

  // 2. Config
  try {
    const { status, body } = await getJson<{
      chainId?: number;
      factory?: string;
      vault?: string | null;
      collateral?: { address?: string };
      duration?: number;
    }>("/v1/config");
    const ok = status === 200;
    checks.push({
      name: "API /v1/config",
      ok,
      detail: ok
        ? `chainId=${body.chainId} factory=${body.factory} duration=${body.duration}s`
        : `status ${status}`,
    });

    if (dep) {
      checks.push({
        name: "factory matches deployments file",
        ok: eqAddr(body.factory, dep.factory),
        detail: `api=${body.factory} file=${dep.factory}`,
      });
      if (body.vault) {
        checks.push({
          name: "vault matches deployments file",
          ok: eqAddr(body.vault, dep.vault),
          detail: `api=${body.vault} file=${dep.vault}`,
        });
      }
      if (body.collateral?.address) {
        checks.push({
          name: "collateral matches deployments file",
          ok: eqAddr(body.collateral.address, dep.collateral.address),
          detail: `api=${body.collateral.address} file=${dep.collateral.address}`,
        });
      }
    }
  } catch (e: any) {
    checks.push({
      name: "API /v1/config",
      ok: false,
      detail: `failed: ${e?.message || e}`,
    });
  }

  // 3. Current round (read-only)
  try {
    const { status, body } = await getJson<{
      round: {
        roundId?: string;
        status?: string;
        market?: string;
        expiry?: number;
      } | null;
      spot?: { yes: string; no: string };
      timeRemaining?: number;
      error?: string;
    }>("/v1/round/current");

    if (status === 200 && body.round) {
      const open = body.round.status === "open";
      checks.push({
        name: "round / current",
        ok: true,
        detail: open
          ? `OPEN round ${body.round.roundId} · ${body.timeRemaining ?? "?"}s left · market ${body.round.market}`
          : `RESOLVED round ${body.round.roundId} · waiting for next (keeper)`,
      });
    } else if (status === 200 && !body.round) {
      checks.push({
        name: "round / current",
        ok: false,
        detail: body.error || "no round — is npm run keeper running?",
      });
    } else {
      checks.push({
        name: "round / current",
        ok: false,
        detail: `status ${status} ${body.error || ""}`,
      });
    }
  } catch (e: any) {
    checks.push({
      name: "round / current",
      ok: false,
      detail: `failed: ${e?.message || e}`,
    });
  }

  console.log(`\nHunch smoke → ${BASE}\n`);
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    console.log(`  [${mark}] ${c.name}`);
    console.log(`         ${c.detail}`);
  }

  const failed = checks.filter((c) => !c.ok).length;
  console.log(
    failed === 0
      ? `\nAll checks passed (${checks.length}). API looks ready for a device dry-run.\n`
      : `\n${failed}/${checks.length} check(s) failed. Fix API/keeper before demo.\n`,
  );

  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("smoke:demo crashed:", e);
  process.exitCode = 1;
});
