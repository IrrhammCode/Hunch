import { defineChain } from "viem";

/** Monad testnet — not always in viem/chains; define explicitly for Privy. */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: { decimals: 18, name: "MON", symbol: "MON" },
  rpcUrls: {
    default: {
      http: [
        process.env.EXPO_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://testnet.monadvision.com",
    },
  },
});

export const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID ?? "";
export const PRIVY_CLIENT_ID = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID ?? "";

/**
 * Bundle IDs look like com.hunch.app. Privy Client IDs are app-client tokens
 * (often client_… / long opaque id) — never reverse-DNS.
 */
export function looksLikeBundleId(value: string) {
  return /^com\.[a-z0-9_.-]+$/i.test(value.trim());
}

export const PRIVY_CLIENT_ID_OK =
  Boolean(PRIVY_CLIENT_ID) && !looksLikeBundleId(PRIVY_CLIENT_ID);

/**
 * Design / mock mode — offline fixtures for UI work (browser or Android).
 * No API, no Privy, no chain. See mobile/DESIGN.md
 */
export const DESIGN_MODE = process.env.EXPO_PUBLIC_DESIGN_MODE === "1";

/** Demo auth when design mode, explicit flag, or Privy credentials missing. */
export const USE_DEMO_AUTH =
  DESIGN_MODE ||
  process.env.EXPO_PUBLIC_USE_DEMO_AUTH === "1" ||
  !PRIVY_APP_ID;

/** Real Privy only when configured AND not in design mode. */
export const HAS_PRIVY =
  !DESIGN_MODE && Boolean(PRIVY_APP_ID) && PRIVY_CLIENT_ID_OK;

export const CHAIN_ID = monadTestnet.id;

export function explorerTx(hash: string) {
  return `https://testnet.monadvision.com/tx/${hash}`;
}

export function explorerAddress(addr: string) {
  return `https://testnet.monadvision.com/address/${addr}`;
}
