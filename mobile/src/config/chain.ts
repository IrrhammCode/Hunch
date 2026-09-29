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

/** Mera passkey only — Privy removed from product path. */
export const PRIVY_APP_ID = "";
export const PRIVY_CLIENT_ID = "";
export const PRIVY_CLIENT_ID_OK = false;
export const HAS_PRIVY = false;

/**
 * FULL MOCK MODE — ON by default until Tenderly + live keys are ready.
 * EXPO_PUBLIC_USE_MOCK=0 → real API / Mera / Perpl.
 */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== "0";

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
