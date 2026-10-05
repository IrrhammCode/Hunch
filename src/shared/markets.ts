/** Multi-asset markets on Monad hub — Pyth feed ids + UI metadata. */
export type MarketMeta = {
  symbol: string; // BTC
  pair: string; // BTC-USD
  label: string; // BTC / USD
  feedId: string; // bytes32 hex
  expo: number; // Pyth expo display
  category?: "meme" | "major" | "l1" | "defi" | "l2";
  volatilityTier?: "HOT" | "MODERATE" | "STEADY"; // HOT = optimal for 60s Blitz scalps; STEADY = optimal for Perps
  volatilityScore?: number; // 0-100 score
};

export const MARKETS: MarketMeta[] = [
  // --- HOT MEME & HIGH-VOLATILITY (Optimal for 60s Blitz scalp) ---
  {
    symbol: "PEPE",
    pair: "PEPE-USD",
    label: "PEPE / USD",
    feedId: "0xd69731a2e74ac1ce884fc3890f7ee324b6deb66147055249568869ed700882e4",
    expo: -8,
    category: "meme",
    volatilityTier: "HOT",
    volatilityScore: 96,
  },
  {
    symbol: "WIF",
    pair: "WIF-USD",
    label: "WIF / USD",
    feedId: "0x4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc",
    expo: -8,
    category: "meme",
    volatilityTier: "HOT",
    volatilityScore: 93,
  },
  {
    symbol: "BONK",
    pair: "BONK-USD",
    label: "BONK / USD",
    feedId: "0x72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419",
    expo: -8,
    category: "meme",
    volatilityTier: "HOT",
    volatilityScore: 91,
  },
  {
    symbol: "DOGE",
    pair: "DOGE-USD",
    label: "DOGE / USD",
    feedId: "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
    expo: -8,
    category: "meme",
    volatilityTier: "HOT",
    volatilityScore: 88,
  },
  {
    symbol: "SHIB",
    pair: "SHIB-USD",
    label: "SHIB / USD",
    feedId: "0xf0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a",
    expo: -8,
    category: "meme",
    volatilityTier: "HOT",
    volatilityScore: 85,
  },
  {
    symbol: "MON",
    pair: "MON-USD",
    label: "MON / USD",
    feedId: "0x31491744e2dbf6df7fcf4ac0820d18a609b49076d45066d3568424e62f686cd1",
    expo: -8,
    category: "l1",
    volatilityTier: "HOT",
    volatilityScore: 84,
  },
  {
    symbol: "SOL",
    pair: "SOL-USD",
    label: "SOL / USD",
    feedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    expo: -8,
    category: "l1",
    volatilityTier: "HOT",
    volatilityScore: 78,
  },
  {
    symbol: "SUI",
    pair: "SUI-USD",
    label: "SUI / USD",
    feedId: "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
    expo: -8,
    category: "l1",
    volatilityTier: "HOT",
    volatilityScore: 76,
  },

  // --- MODERATE VOLATILITY (Both 60s Blitz & Perps) ---
  {
    symbol: "NEAR",
    pair: "NEAR-USD",
    label: "NEAR / USD",
    feedId: "0xc415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750",
    expo: -8,
    category: "l1",
    volatilityTier: "MODERATE",
    volatilityScore: 68,
  },
  {
    symbol: "AVAX",
    pair: "AVAX-USD",
    label: "AVAX / USD",
    feedId: "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
    expo: -8,
    category: "l1",
    volatilityTier: "MODERATE",
    volatilityScore: 65,
  },
  {
    symbol: "TIA",
    pair: "TIA-USD",
    label: "TIA / USD",
    feedId: "0x09f7c1d7dfbb7df2b8fe3d3d87ee94a2259d212da4f30c1f0540d066dfa44723",
    expo: -8,
    category: "defi",
    volatilityTier: "MODERATE",
    volatilityScore: 64,
  },
  {
    symbol: "APT",
    pair: "APT-USD",
    label: "APT / USD",
    feedId: "0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
    expo: -8,
    category: "l1",
    volatilityTier: "MODERATE",
    volatilityScore: 62,
  },
  {
    symbol: "ARB",
    pair: "ARB-USD",
    label: "ARB / USD",
    feedId: "0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
    expo: -8,
    category: "l2",
    volatilityTier: "MODERATE",
    volatilityScore: 60,
  },
  {
    symbol: "OP",
    pair: "OP-USD",
    label: "OP / USD",
    feedId: "0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
    expo: -8,
    category: "l2",
    volatilityTier: "MODERATE",
    volatilityScore: 58,
  },
  {
    symbol: "PYTH",
    pair: "PYTH-USD",
    label: "PYTH / USD",
    feedId: "0x0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff",
    expo: -8,
    category: "defi",
    volatilityTier: "MODERATE",
    volatilityScore: 56,
  },

  // --- STEADY & MAJORS (Optimal for Leveraged Perps with TP/SL) ---
  {
    symbol: "BTC",
    pair: "BTC-USD",
    label: "BTC / USD",
    feedId: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    expo: -8,
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 32,
  },
  {
    symbol: "ETH",
    pair: "ETH-USD",
    label: "ETH / USD",
    feedId: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    expo: -8,
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 35,
  },
  {
    symbol: "BNB",
    pair: "BNB-USD",
    label: "BNB / USD",
    feedId: "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
    expo: -8,
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 38,
  },
  {
    symbol: "XRP",
    pair: "XRP-USD",
    label: "XRP / USD",
    feedId: "0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
    expo: -8,
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 42,
  },
  {
    symbol: "LINK",
    pair: "LINK-USD",
    label: "LINK / USD",
    feedId: "0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
    expo: -8,
    category: "defi",
    volatilityTier: "STEADY",
    volatilityScore: 46,
  },
  {
    symbol: "ADA",
    pair: "ADA-USD",
    label: "ADA / USD",
    feedId: "0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
    expo: -8,
    category: "l1",
    volatilityTier: "STEADY",
    volatilityScore: 48,
  },
  {
    symbol: "DOT",
    pair: "DOT-USD",
    label: "DOT / USD",
    feedId: "0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b",
    expo: -8,
    category: "l1",
    volatilityTier: "STEADY",
    volatilityScore: 50,
  },
  {
    symbol: "LTC",
    pair: "LTC-USD",
    label: "LTC / USD",
    feedId: "0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54",
    expo: -8,
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 40,
  },
  {
    symbol: "BCH",
    pair: "BCH-USD",
    label: "BCH / USD",
    feedId: "0x3dd2b63686a450ec7290df3a1e0b583c0481f651351edfa7636f39aed55cf8a3",
    expo: -8,
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 39,
  },
];

export function marketBySymbol(symbol: string) {
  return MARKETS.find((m) => m.symbol.toUpperCase() === symbol.toUpperCase());
}

export function marketByFeedId(feedId: string) {
  const id = feedId.toLowerCase();
  return MARKETS.find((m) => m.feedId.toLowerCase() === id);
}

export function feedIdFor(symbolOrPair?: string) {
  if (!symbolOrPair) return MARKETS[0]!.feedId;
  const m = marketBySymbol(symbolOrPair) ?? MARKETS.find((p) => p.pair === symbolOrPair);
  return m?.feedId ?? MARKETS[0]!.feedId;
}

export function symbolForFeed(feedId?: string) {
  if (!feedId) return "BTC";
  return marketByFeedId(feedId)?.symbol ?? "BTC";
}

export function labelForFeed(feedId?: string) {
  if (!feedId) return "BTC / USD";
  return marketByFeedId(feedId)?.label ?? "Unknown";
}

/** Env override: MARKETS=BTC,ETH,SOL */
export function enabledMarkets(): MarketMeta[] {
  const raw = process.env.HUNCH_MARKETS || process.env.MARKETS;
  if (!raw) return MARKETS;
  const list = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const picked = MARKETS.filter((m) => list.includes(m.symbol));
  return picked.length ? picked : MARKETS;
}

export function getMarketVolatility(symbol: string) {
  const m = marketBySymbol(symbol);
  const tier = m?.volatilityTier || "MODERATE";
  const score = m?.volatilityScore ?? 50;
  return {
    tier,
    score,
    category: m?.category || "l1",
    recommendedMode: score >= 70 ? ("blitz" as const) : ("perps" as const),
    reason:
      score >= 70
        ? "High intra-minute velocity. Optimal for 60s UP/DOWN binary scalps!"
        : score <= 45
          ? "Smooth macro trend & low whipsaw. Optimal for leveraged Perpetuals with TP/SL guard!"
          : "Balanced momentum. Well-suited for both 60s Blitz scalps and leveraged Perps.",
  };
}
