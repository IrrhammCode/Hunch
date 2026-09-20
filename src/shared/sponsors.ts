/**
 * Metropolis builder perks — Quicknode / Tenderly / Zerion.
 * Keys live only in .env (never print values).
 */
import { loadEnv } from "./chain";
import { isQuicknodeUrl, monadRpcSurface, maskRpcUrl } from "./rpc";

export function sponsorEnv() {
  loadEnv();
  return {
    monadRpc: process.env.MONAD_RPC_URL || "",
    keeperRpc: process.env.KEEPER_RPC_URL || "",
    apiRpc: process.env.API_RPC_URL || "",
    monadWss: process.env.MONAD_WSS_URL || "",
    baseRpc: process.env.BASE_RPC_URL || "",
    tenderlyAccount: process.env.TENDERLY_ACCOUNT || "",
    tenderlyProject: process.env.TENDERLY_PROJECT || "",
    tenderlyAccessKey: process.env.TENDERLY_ACCESS_KEY || "",
    zerionApiKey: process.env.ZERION_API_KEY || "",
    perplApiKey: process.env.PERPL_API_KEY || "",
    perplApiKeySecret: process.env.PERPL_API_KEY_SECRET || "",
  };
}

export function isQuicknodeRpc(url: string) {
  return isQuicknodeUrl(url);
}

function isPlaceholderKey(v: string | undefined) {
  const s = (v || "").trim();
  if (!s) return true;
  return /^(your-|xxx|todo|placeholder|paste-|example)/i.test(s);
}

export function tenderlyConfigured() {
  const e = sponsorEnv();
  return (
    !isPlaceholderKey(e.tenderlyAccount) &&
    !isPlaceholderKey(e.tenderlyProject) &&
    !isPlaceholderKey(e.tenderlyAccessKey)
  );
}

export function zerionConfigured() {
  return !isPlaceholderKey(sponsorEnv().zerionApiKey);
}

export function perplAuthConfiguredSponsor() {
  const e = sponsorEnv();
  return !isPlaceholderKey(e.perplApiKey) && !isPlaceholderKey(e.perplApiKeySecret);
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
  const surface = monadRpcSurface();
  const primaryQn = isQuicknodeUrl(e.monadRpc);
  return {
    quicknode: primaryQn
      ? "configured"
      : surface.quicknodeEndpoints > 0
        ? "partial"
        : e.monadRpc
          ? "custom-rpc"
          : "missing",
    monadRpcHint: primaryQn
      ? `Quicknode ${maskRpcUrl(e.monadRpc)}`
      : surface.usesQuicknode
        ? `Quicknode via role RPC (n=${surface.quicknodeEndpoints})`
        : e.monadRpc
          ? maskRpcUrl(e.monadRpc)
          : "unset — public default",
    quicknodeEndpoints: surface.quicknodeEndpoints,
    quicknodeSurfaces: {
      api: isQuicknodeUrl(surface.resolved.api),
      keeper: isQuicknodeUrl(surface.resolved.keeper),
      indexer: isQuicknodeUrl(surface.resolved.indexer),
      hardhat: isQuicknodeUrl(surface.resolved.hardhat),
      wss: isQuicknodeUrl(e.monadWss),
    },
    tenderly: tenderlyConfigured() ? "configured" : "missing",
    zerion: zerionConfigured() ? "configured" : "missing",
    perplKeys: perplAuthConfiguredSponsor() ? "configured" : "missing",
  };
}
