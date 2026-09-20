/**
 * Monad RPC resolution — maximize Quicknode Build perk.
 * Role-specific endpoints isolate keeper/API/indexer on Build (up to 10 URLs).
 * Fallback: MONAD_RPC_URL → public testnet-rpc.monad.xyz
 *
 * Callers must load .env first (chain.loadEnv / hardhat / doctor).
 */

export type MonadRpcRole = "default" | "api" | "keeper" | "indexer" | "hardhat";

const PUBLIC_TESTNET = "https://testnet-rpc.monad.xyz";

export function isQuicknodeUrl(url: string) {
  return /quiknode\.pro|quicknode\.(com|io)/i.test(url || "");
}

function envUrl(key: string): string {
  return (process.env[key] || "").trim();
}

export function resolveMonadRpcUrl(role: MonadRpcRole = "default"): string {
  const roleKeys: Record<MonadRpcRole, string> = {
    default: "",
    api: "API_RPC_URL",
    keeper: "KEEPER_RPC_URL",
    indexer: "INDEXER_RPC_URL",
    hardhat: "HARDHAT_RPC_URL",
  };
  const roleKey = roleKeys[role];
  const candidates = [
    roleKey ? envUrl(roleKey) : "",
    envUrl("MONAD_RPC_URL"),
    PUBLIC_TESTNET,
  ];
  for (const c of candidates) if (c) return c;
  return PUBLIC_TESTNET;
}

export function monadRpcSurface() {
  const urls = {
    monadRpcUrl: envUrl("MONAD_RPC_URL"),
    apiRpcUrl: envUrl("API_RPC_URL"),
    keeperRpcUrl: envUrl("KEEPER_RPC_URL"),
    indexerRpcUrl: envUrl("INDEXER_RPC_URL"),
    hardhatRpcUrl: envUrl("HARDHAT_RPC_URL"),
    monadWssUrl: envUrl("MONAD_WSS_URL"),
    perplRpcUrl: envUrl("PERPL_RPC_URL"),
  };
  const all = Object.values(urls).filter(Boolean);
  const qnCount = all.filter((u) => isQuicknodeUrl(u)).length;
  return {
    ...urls,
    resolved: {
      api: resolveMonadRpcUrl("api"),
      keeper: resolveMonadRpcUrl("keeper"),
      indexer: resolveMonadRpcUrl("indexer"),
      hardhat: resolveMonadRpcUrl("hardhat"),
    },
    quicknodeEndpoints: qnCount,
    usesQuicknode: isQuicknodeUrl(urls.monadRpcUrl) || qnCount > 0,
  };
}

/** Mask URL for logs — never print full auth token. */
export function maskRpcUrl(url: string) {
  if (!url) return "(unset)";
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/…`;
  } catch {
    return url.slice(0, 24) + "…";
  }
}
