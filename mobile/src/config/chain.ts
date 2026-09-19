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

/** Explicit demo login only — not used when Privy IDs are missing. */
export const USE_DEMO_AUTH = process.env.EXPO_PUBLIC_USE_DEMO_AUTH === "1";

export const HAS_PRIVY = Boolean(PRIVY_APP_ID) && PRIVY_CLIENT_ID_OK;

/** Production path: real Privy wallet trades. */
export const REAL_TRADING = HAS_PRIVY && !USE_DEMO_AUTH;

export const CHAIN_ID = monadTestnet.id;

export function explorerTx(hash: string, chainKey = "monad") {
  if (chainKey === "base") return `https://sepolia.basescan.org/tx/${hash}`;
  return `https://testnet.monadvision.com/tx/${hash}`;
}

export function explorerAddress(addr: string, chainKey = "monad") {
  if (chainKey === "base") return `https://sepolia.basescan.org/address/${addr}`;
  return `https://testnet.monadvision.com/address/${addr}`;
}
