/**
 * Canonical Monad + Pyth + AUSD addresses for Hunch.
 * AUSD is mainnet-only today; testnet deploys mintable MockAUSD (same decimals/symbol).
 */
export const MONAD_TESTNET = {
  chainId: 10143,
  name: "Monad Testnet",
  rpcUrl: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
  explorer: "https://testnet.monadvision.com",
  pyth: "0x2880aB155794e7179c9eE2e38200202908C17B43",
  // Official BTC/USD Pyth feed id
  btcUsdFeedId: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  // Not deployed on testnet (eth_getCode = 0x) — use MockAUSD from deploy
  ausd: null as string | null,
  usdc: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
} as const;

export const MONAD_MAINNET = {
  chainId: 143,
  name: "Monad Mainnet",
  rpcUrl: process.env.MONAD_MAINNET_RPC_URL || "https://rpc.monad.xyz",
  explorer: "https://monadvision.com",
  pyth: "0x2880aB155794e7179c9eE2e38200202908C17B43",
  btcUsdFeedId: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ausd: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
} as const;

/** Upgraded Hermes (requires PYTH_API_KEY). */
export const HERMES = {
  baseUrl: process.env.HERMES_URL || "https://pyth.dourolabs.app/hermes",
  legacyUrl: "https://hermes.pyth.network",
} as const;
