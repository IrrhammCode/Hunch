import { defineChain } from "viem";

/** Monad testnet — settlement hub for Hunch markets. */
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

/** Base Sepolia — second settlement chain. */
export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  network: "base-sepolia",
  nativeCurrency: { decimals: 18, name: "ETH", symbol: "ETH" },
  rpcUrls: {
    default: {
      http: [
        process.env.EXPO_PUBLIC_BASE_RPC_URL || "https://sepolia.base.org",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://sepolia.basescan.org",
    },
  },
});

export const SUPPORTED_CHAINS = [monadTestnet, baseSepolia];

export const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID ?? "";
export const PRIVY_CLIENT_ID = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID ?? "";

export function looksLikeBundleId(value: string) {
  return /^com\.[a-z0-9_.-]+$/i.test(value.trim());
}

export const PRIVY_CLIENT_ID_OK =
  Boolean(PRIVY_CLIENT_ID) && !looksLikeBundleId(PRIVY_CLIENT_ID);

export const HAS_PRIVY = Boolean(PRIVY_APP_ID) && PRIVY_CLIENT_ID_OK;

/**
 * FULL MOCK MODE — design/demo until Tenderly + live keys are ready.
 * EXPO_PUBLIC_USE_MOCK=1 → offline fixtures, mock wallet, fake fills (clearly labeled).
 * EXPO_PUBLIC_USE_MOCK=0 → real API / Mera / Privy / Perpl.
 */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === "1";

/** Real trades only when mock is off. */
export const REAL_TRADING = !USE_MOCK;

export const CHAIN_ID = monadTestnet.id;

export function explorerTx(hash: string, chainKey = "monad") {
  if (chainKey === "base") return `https://sepolia.basescan.org/tx/${hash}`;
  return `https://testnet.monadvision.com/tx/${hash}`;
}

export function explorerAddress(addr: string, chainKey = "monad") {
  if (chainKey === "base") return `https://sepolia.basescan.org/address/${addr}`;
  return `https://testnet.monadvision.com/address/${addr}`;
}
