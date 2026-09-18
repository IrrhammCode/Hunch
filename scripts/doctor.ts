/**
 * Preflight doctor — env + repo readiness. Never prints secret values.
 *
 * Usage: npm run doctor
 */
import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..");

type Level = "ok" | "fail" | "warn" | "info";
type Line = { level: Level; text: string };

const lines: Line[] = [];

function ok(text: string) {
  lines.push({ level: "ok", text });
}
function fail(text: string) {
  lines.push({ level: "fail", text });
}
function warn(text: string) {
  lines.push({ level: "warn", text });
}
function info(text: string) {
  lines.push({ level: "info", text });
}

function readEnvFile(file: string): Record<string, string> {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return {};
  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function present(v: string | undefined) {
  return typeof v === "string" && v.trim().length > 0;
}

function maskHint(v: string | undefined) {
  // Never print the value — only shape
  if (!present(v)) return "empty";
  const n = v!.trim().length;
  return `set (${n} chars)`;
}

async function checkLiveApi(baseUrl: string) {
  const base = baseUrl.replace(/\/$/, "");
  try {
    const h = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2500) });
    if (h.ok) ok(`API /health reachable → ${base}`);
    else warn(`API /health status ${h.status} → ${base}`);
  } catch {
    warn(`API not reachable at ${base} (start npm run api, or fix EXPO_PUBLIC_API_URL)`);
    return;
  }
  try {
    const r = await fetch(`${base}/v1/config`, { signal: AbortSignal.timeout(2500) });
    if (r.ok) {
      const j = (await r.json()) as { chainId?: number; factory?: string; perpl?: any; collateral?: any };
      ok(`API /v1/config chainId=${j.chainId ?? "?"} factory=${j.factory ? "present" : "missing"} AUSD=${j.collateral?.address ? "Agora AUSD set" : "missing"}`);
    } else {
      warn(`API /v1/config status ${r.status}`);
    }
  } catch (e: any) {
    warn(`API /v1/config failed: ${e?.message || e}`);
  }

  try {
    const p = await fetch(`${base}/v1/perpl/markets`, { signal: AbortSignal.timeout(3500) });
    if (p.ok) {
      const pj = (await p.json()) as { markets?: any[] };
      ok(`API /v1/perpl/markets reachable (${pj.markets?.length ?? 0} perpetual markets)`);
    } else {
      warn(`API /v1/perpl/markets status ${p.status}`);
    }
  } catch (e: any) {
    warn(`API /v1/perpl/markets failed: ${e?.message || e}`);
  }
}

async function main() {
  console.log("\nHunch doctor (secrets are never printed)\n");

  // --- Root .env ---
  const rootEnvPath = path.join(root, ".env");
  if (!fs.existsSync(rootEnvPath)) {
    fail("root .env missing — cp .env.example .env");
  } else {
    ok("root .env exists");
  }
  const rootEnv = readEnvFile(".env");

  if (present(rootEnv.PRIVATE_KEY)) ok(`PRIVATE_KEY ${maskHint(rootEnv.PRIVATE_KEY)}`);
  else fail("PRIVATE_KEY empty (keeper/API gas) — required for judge demo");

  if (present(rootEnv.PYTH_API_KEY)) ok(`PYTH_API_KEY ${maskHint(rootEnv.PYTH_API_KEY)}`);
  else warn("PYTH_API_KEY empty — keeper may fail Pyth pulls");

  if (present(rootEnv.MONAD_RPC_URL)) ok(`MONAD_RPC_URL ${maskHint(rootEnv.MONAD_RPC_URL)}`);
  else info("MONAD_RPC_URL unset — using default testnet RPC");
  if (/quicknode/i.test(rootEnv.MONAD_RPC_URL || "")) ok("Monad RPC = Quicknode (perk)");
  else if (present(rootEnv.MONAD_RPC_URL) && !/testnet-rpc\.monad\.xyz/i.test(rootEnv.MONAD_RPC_URL))
    ok("Monad RPC custom endpoint set");
  else warn("Monad RPC is public default — claim Quicknode perk to avoid rate limits");

  if (present(rootEnv.TENDERLY_ACCESS_KEY) && present(rootEnv.TENDERLY_ACCOUNT)) {
    ok(`Tenderly keys ${maskHint(rootEnv.TENDERLY_ACCESS_KEY)}`);
  } else {
    warn("Tenderly not set — npm run sim:tx unavailable (claim Pro perk)");
  }
  if (present(rootEnv.ZERION_API_KEY)) ok(`ZERION_API_KEY ${maskHint(rootEnv.ZERION_API_KEY)}`);
  else warn("ZERION_API_KEY empty — /v1/zerion/* returns not-configured");

  // --- mobile/.env ---
  const mobileEnvPath = path.join(root, "mobile", ".env");
  if (!fs.existsSync(mobileEnvPath)) {
    fail("mobile/.env missing — cp mobile/.env.example mobile/.env");
  } else {
    ok("mobile/.env exists");
  }
  const mEnv = readEnvFile(path.join("mobile", ".env"));

  const apiUrl = mEnv.EXPO_PUBLIC_API_URL?.trim();
  if (!present(apiUrl)) {
    fail("EXPO_PUBLIC_API_URL empty");
  } else {
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(apiUrl!);
    if (isLocalhost) {
      warn(
        "EXPO_PUBLIC_API_URL is localhost — phone cannot reach this. Use LAN IP or ngrok.",
      );
    } else {
      ok(`EXPO_PUBLIC_API_URL ${isLocalhost ? "localhost" : "non-localhost"} set`);
    }
    if (/YOUR_API_HOST|192\.168\.100\.4/i.test(apiUrl!)) {
      warn(
        "EXPO_PUBLIC_API_URL looks like a sample/default host — confirm it is your machine or tunnel",
      );
    }
  }

  if (present(mEnv.EXPO_PUBLIC_PRIVY_APP_ID)) {
    ok(`EXPO_PUBLIC_PRIVY_APP_ID ${maskHint(mEnv.EXPO_PUBLIC_PRIVY_APP_ID)}`);
  } else {
    fail("EXPO_PUBLIC_PRIVY_APP_ID empty — see PRIVY_SETUP.md");
  }

  if (present(mEnv.EXPO_PUBLIC_PRIVY_CLIENT_ID)) {
    ok(`EXPO_PUBLIC_PRIVY_CLIENT_ID ${maskHint(mEnv.EXPO_PUBLIC_PRIVY_CLIENT_ID)}`);
  } else {
    fail("EXPO_PUBLIC_PRIVY_CLIENT_ID empty — see PRIVY_SETUP.md");
  }

  const demo = mEnv.EXPO_PUBLIC_USE_DEMO_AUTH?.trim();
  if (present(demo) && demo !== "0") {
    fail(
      "EXPO_PUBLIC_USE_DEMO_AUTH is set — judge mode expects real Privy. Unset and restart Metro.",
    );
  } else {
    ok("EXPO_PUBLIC_USE_DEMO_AUTH unset (judge mode)");
  }

  // eas.json preview placeholder
  try {
    const eas = JSON.parse(
      fs.readFileSync(path.join(root, "mobile", "eas.json"), "utf8"),
    ) as { build?: Record<string, { env?: Record<string, string> }> };
    const prev = eas.build?.preview?.env?.EXPO_PUBLIC_API_URL;
    if (prev && /YOUR_API_HOST/i.test(prev)) {
      warn("eas.json preview EXPO_PUBLIC_API_URL still YOUR_API_HOST — replace before eas:preview");
    } else if (prev) {
      ok("eas.json preview EXPO_PUBLIC_API_URL set");
    }
  } catch {
    info("mobile/eas.json not readable");
  }

  // --- Repo artifacts ---
  const artifacts: [string, boolean][] = [
    ["deployments/monad-testnet.json", fs.existsSync(path.join(root, "deployments", "monad-testnet.json"))],
    ["site/index.html", fs.existsSync(path.join(root, "site", "index.html"))],
    ["SUBMIT.md", fs.existsSync(path.join(root, "SUBMIT.md"))],
    ["SUBMISSION_FORM.md", fs.existsSync(path.join(root, "SUBMISSION_FORM.md"))],
    ["OPS.md", fs.existsSync(path.join(root, "OPS.md"))],
    ["PRIVY_SETUP.md", fs.existsSync(path.join(root, "PRIVY_SETUP.md"))],
    ["EAS_SETUP.md", fs.existsSync(path.join(root, "EAS_SETUP.md"))],
    ["mobile/DEMO.md", fs.existsSync(path.join(root, "mobile", "DEMO.md"))],
  ];
  for (const [name, exists] of artifacts) {
    if (exists) ok(`repo file ${name}`);
    else fail(`missing ${name}`);
  }

  // Live API (optional)
  if (present(apiUrl) && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(apiUrl!)) {
    await checkLiveApi(apiUrl!);
  } else {
    const fallback = "http://localhost:8787";
    info(`skipping phone URL live check; probing ${fallback}`);
    await checkLiveApi(fallback);
  }

  // Print
  const icons: Record<Level, string> = {
    ok: "✅",
    fail: "❌",
    warn: "⚠️ ",
    info: "ℹ️ ",
  };
  for (const l of lines) {
    console.log(`  ${icons[l.level]} ${l.text}`);
  }

  const fails = lines.filter((l) => l.level === "fail").length;
  const warns = lines.filter((l) => l.level === "warn").length;
  console.log(
    `\n${fails === 0 ? "Preflight OK" : "Preflight BLOCKED"} · ${fails} fail · ${warns} warn\n`,
  );
  console.log("Next: see PRIVY_SETUP.md / EAS_SETUP.md · then mobile/DEMO.md\n");

  if (fails > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("doctor crashed:", e);
  process.exitCode = 1;
});
