/**
 * Canonical Monad + Pyth + AUSD addresses for Hunch.
 * Multi-asset feeds for the trading-app market board (settlement = Monad hub).
 */
export const PYTH_FEEDS = {
  BTC_USD: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH_USD: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL_USD: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
} as const;

export const MONAD_TESTNET = {
  chainId: 10143,
  name: "Monad Testnet",
  rpcUrl: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
  explorer: "https://testnet.monadvision.com",
  pyth: "0x2880aB155794e7179c9eE2e38200202908C17B43",
  // Official BTC/USD Pyth feed id (legacy key kept for compatibility)
  btcUsdFeedId: PYTH_FEEDS.BTC_USD,
  ausd: null as string | null,
  usdc: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
} as const;

export const MONAD_MAINNET = {
  chainId: 143,
  name: "Monad Mainnet",
  rpcUrl: process.env.MONAD_MAINNET_RPC_URL || "https://rpc.monad.xyz",
  explorer: "https://monadvision.com",
  pyth: "0x2880aB155794e7179c9eE2e38200202908C17B43",
  btcUsdFeedId: PYTH_FEEDS.BTC_USD,
  ausd: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
} as const;

/** Upgraded Hermes (requires PYTH_API_KEY). */
export const HERMES = {
  baseUrl: process.env.HERMES_URL || "https://pyth.dourolabs.app/hermes",
  legacyUrl: "https://hermes.pyth.network",
} as const;
