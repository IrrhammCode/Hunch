/**
 * Metropolis builder perks — Quicknode / Tenderly / Zerion.
 * Keys live only in .env (never print values).
 */
import { loadEnv } from "./chain";

export function sponsorEnv() {
  loadEnv();
  return {
    monadRpc: process.env.MONAD_RPC_URL || "",
    baseRpc: process.env.BASE_RPC_URL || "",
    tenderlyAccount: process.env.TENDERLY_ACCOUNT || "",
    tenderlyProject: process.env.TENDERLY_PROJECT || "",
    tenderlyAccessKey: process.env.TENDERLY_ACCESS_KEY || "",
    zerionApiKey: process.env.ZERION_API_KEY || "",
  };
}

export function isQuicknodeRpc(url: string) {
  return /quicknode\.com/i.test(url || "");
}

export function tenderlyConfigured() {
  const e = sponsorEnv();
  return Boolean(e.tenderlyAccount && e.tenderlyProject && e.tenderlyAccessKey);
}

export function zerionConfigured() {
  return Boolean(sponsorEnv().zerionApiKey);
}

export function tenderlyDashboardUrl(account?: string, project?: string) {
  const e = sponsorEnv();
  const a = account || e.tenderlyAccount;
  const p = project || e.tenderlyProject;
  if (!a || !p) return "https://dashboard.tenderly.co";
  return `https://dashboard.tenderly.co/account/${a}/project/${p}`;
}

export function tenderlyTxUrl(txHash: string) {
  const e = sponsorEnv();
  if (!e.tenderlyAccount || !e.tenderlyProject || !txHash) {
    return `https://testnet.monadvision.com/tx/${txHash}`;
  }
  return `${tenderlyDashboardUrl()}/testnet/tx/${txHash}`;
}

export function perkStatus() {
  const e = sponsorEnv();
  return {
    quicknode: isQuicknodeRpc(e.monadRpc) ? "configured" : e.monadRpc ? "custom-rpc" : "missing",
    monadRpcHint: isQuicknodeRpc(e.monadRpc)
      ? "Quicknode"
      : e.monadRpc
        ? e.monadRpc.replace(/:\/\/.*@/, "://***@").slice(0, 48)
        : "unset — public default",
    tenderly: tenderlyConfigured() ? "configured" : "missing",
    zerion: zerionConfigured() ? "configured" : "missing",
  };
}
