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

/** Demo auth only when explicitly enabled OR Privy credentials are missing. */
export const USE_DEMO_AUTH =
  process.env.EXPO_PUBLIC_USE_DEMO_AUTH === "1" || !PRIVY_APP_ID;

export const HAS_PRIVY = Boolean(PRIVY_APP_ID && PRIVY_CLIENT_ID);

export const CHAIN_ID = monadTestnet.id;

export function explorerTx(hash: string) {
  return `https://testnet.monadvision.com/tx/${hash}`;
}

export function explorerAddress(addr: string) {
  return `https://testnet.monadvision.com/address/${addr}`;
}
