/**
 * Comprehensive Token Markets Suite & Volatility Heat Radar for Hunch & Perpl
 * Categorizes all 24 Monad testnet tokens with volatility tiers & smart mode recommendations.
 */

export type MarketCategory = "meme" | "major" | "l1" | "defi" | "l2";
export type VolatilityTier = "HOT" | "MODERATE" | "STEADY";

export type TokenMarketConfig = {
  symbol: string;
  pair: string;
  label: string;
  category: MarketCategory;
  volatilityTier: VolatilityTier;
  volatilityScore: number; // 0-100
  description: string;
};

export const TOKEN_MARKETS: TokenMarketConfig[] = [
  // --- HIGH VOLATILITY / MEMES (Optimal for 60s Blitz scalps) ---
  {
    symbol: "PEPE",
    pair: "PEPE-USD",
    label: "PEPE / USD",
    category: "meme",
    volatilityTier: "HOT",
    volatilityScore: 96,
    description: "Peak meme mania · Fast micro-candle oscillations ideal for 60s Blitz",
  },
  {
    symbol: "WIF",
    pair: "WIF-USD",
    label: "WIF / USD",
    category: "meme",
    volatilityTier: "HOT",
    volatilityScore: 93,
    description: "High momentum dogwifhat · Rapid intra-minute swings",
  },
  {
    symbol: "BONK",
    pair: "BONK-USD",
    label: "BONK / USD",
    category: "meme",
    volatilityTier: "HOT",
    volatilityScore: 91,
    description: "Solana community dog token · High frequency orderbook velocity",
  },
  {
    symbol: "DOGE",
    pair: "DOGE-USD",
    label: "DOGE / USD",
    category: "meme",
    volatilityTier: "HOT",
    volatilityScore: 88,
    description: "OG meme crypto · Volatile burst momentum across short timeframes",
  },
  {
    symbol: "SHIB",
    pair: "SHIB-USD",
    label: "SHIB / USD",
    category: "meme",
    volatilityTier: "HOT",
    volatilityScore: 85,
    description: "Shiba Inu ecosystem · Sharp liquidity surges and rapid ticks",
  },
  {
    symbol: "MON",
    pair: "MON-USD",
    label: "MON / USD",
    category: "l1",
    volatilityTier: "HOT",
    volatilityScore: 84,
    description: "Monad native asset · High testnet trading volume and rapid action",
  },
  {
    symbol: "SOL",
    pair: "SOL-USD",
    label: "SOL / USD",
    category: "l1",
    volatilityTier: "HOT",
    volatilityScore: 78,
    description: "High throughput L1 · Fast volatility bursts on breaking news",
  },
  {
    symbol: "SUI",
    pair: "SUI-USD",
    label: "SUI / USD",
    category: "l1",
    volatilityTier: "HOT",
    volatilityScore: 76,
    description: "Next-gen Move L1 · High-beta oscillations suitable for 60s",
  },

  // --- MODERATE VOLATILITY (Dual-Mode: 60s Blitz & Perps) ---
  {
    symbol: "NEAR",
    pair: "NEAR-USD",
    label: "NEAR / USD",
    category: "l1",
    volatilityTier: "MODERATE",
    volatilityScore: 68,
    description: "AI & chain abstraction L1 · Balanced trend swings with scalping opportunity",
  },
  {
    symbol: "AVAX",
    pair: "AVAX-USD",
    label: "AVAX / USD",
    category: "l1",
    volatilityTier: "MODERATE",
    volatilityScore: 65,
    description: "Avalanche subnet ecosystem · Steady momentum with distinct breakout moves",
  },
  {
    symbol: "TIA",
    pair: "TIA-USD",
    label: "TIA / USD",
    category: "defi",
    volatilityTier: "MODERATE",
    volatilityScore: 64,
    description: "Modular data availability · Clean technical swings for 20x Perps or 60s",
  },
  {
    symbol: "APT",
    pair: "APT-USD",
    label: "APT / USD",
    category: "l1",
    volatilityTier: "MODERATE",
    volatilityScore: 62,
    description: "Aptos Move chain · Active intraday range trading",
  },
  {
    symbol: "ARB",
    pair: "ARB-USD",
    label: "ARB / USD",
    category: "l2",
    volatilityTier: "MODERATE",
    volatilityScore: 60,
    description: "Arbitrum Ethereum L2 · Moderate intra-hour momentum",
  },
  {
    symbol: "OP",
    pair: "OP-USD",
    label: "OP / USD",
    category: "l2",
    volatilityTier: "MODERATE",
    volatilityScore: 58,
    description: "Optimism Superchain · Predictable technical levels for perps and binary bets",
  },
  {
    symbol: "PYTH",
    pair: "PYTH-USD",
    label: "PYTH / USD",
    category: "defi",
    volatilityTier: "MODERATE",
    volatilityScore: 56,
    description: "Pyth Network oracle token · Solid depth and consistent pricing",
  },

  // --- STEADY & MACRO TREND (Optimal for Leveraged Perps with TP/SL Guard) ---
  {
    symbol: "BTC",
    pair: "BTC-USD",
    label: "BTC / USD",
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 32,
    description: "Bitcoin · Premier deep liquidity, low whipsaw, optimal for 20x-50x leverage",
  },
  {
    symbol: "ETH",
    pair: "ETH-USD",
    label: "ETH / USD",
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 35,
    description: "Ethereum · Steady macro trends with excellent TP/SL follow-through",
  },
  {
    symbol: "BNB",
    pair: "BNB-USD",
    label: "BNB / USD",
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 38,
    description: "BNB Chain · High open interest with predictable trendlines",
  },
  {
    symbol: "XRP",
    pair: "XRP-USD",
    label: "XRP / USD",
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 42,
    description: "XRP · Strong macro support/resistance levels ideal for swing Perps",
  },
  {
    symbol: "LINK",
    pair: "LINK-USD",
    label: "LINK / USD",
    category: "defi",
    volatilityTier: "STEADY",
    volatilityScore: 46,
    description: "Chainlink · Institutional DeFi standard with smooth directional drift",
  },
  {
    symbol: "ADA",
    pair: "ADA-USD",
    label: "ADA / USD",
    category: "l1",
    volatilityTier: "STEADY",
    volatilityScore: 48,
    description: "Cardano · Reliable long-term support bounds with gradual price moves",
  },
  {
    symbol: "DOT",
    pair: "DOT-USD",
    label: "DOT / USD",
    category: "l1",
    volatilityTier: "STEADY",
    volatilityScore: 50,
    description: "Polkadot · Measured volatility with defined horizontal channels",
  },
  {
    symbol: "LTC",
    pair: "LTC-USD",
    label: "LTC / USD",
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 40,
    description: "Litecoin · Battle-tested digital silver with steady trend momentum",
  },
  {
    symbol: "BCH",
    pair: "BCH-USD",
    label: "BCH / USD",
    category: "major",
    volatilityTier: "STEADY",
    volatilityScore: 39,
    description: "Bitcoin Cash · Clean breakout extensions for leveraged perp longs",
  },
];

export function getMarketConfig(symbol?: string): TokenMarketConfig {
  if (!symbol) return TOKEN_MARKETS[0];
  const s = symbol.toUpperCase().replace(/-USD$|\/USD$|USD$/, "");
  return TOKEN_MARKETS.find((m) => m.symbol === s) || {
    symbol: s,
    pair: `${s}-USD`,
    label: `${s} / USD`,
    category: "l1",
    volatilityTier: "MODERATE",
    volatilityScore: 50,
    description: `${s} crypto market on Monad`,
  };
}

export type HeatProfile = {
  tier: VolatilityTier;
  score: number;
  category: MarketCategory;
  recommendedMode: "blitz" | "perps";
  modeBadge: string;
  headline: string;
  explanation: string;
  actionText: string;
  accentColor: string;
};

export function getMarketHeat(symbol?: string): HeatProfile {
  const m = getMarketConfig(symbol);
  const score = m.volatilityScore;

  if (score >= 75) {
    return {
      tier: "HOT",
      score,
      category: m.category,
      recommendedMode: "blitz",
      modeBadge: `HOT · ${score}/100`,
      headline: "HIGH VOLATILITY",
      explanation: "Elevated intra-minute price velocity. Optimal for 60s UP/DOWN binary scalping.",
      actionText: "Switch to 60s Blitz",
      accentColor: "#FF5533",
    };
  }

  if (score <= 45) {
    return {
      tier: "STEADY",
      score,
      category: m.category,
      recommendedMode: "perps",
      modeBadge: `STEADY · ${score}/100`,
      headline: "STEADY MOMENTUM",
      explanation: "Low whipsaw risk with persistent trendlines. Optimal for leveraged Perps with TP/SL guard.",
      actionText: "Switch to Perps (20x)",
      accentColor: "#33B5E5",
    };
  }

  return {
    tier: "MODERATE",
    score,
    category: m.category,
    recommendedMode: "blitz",
    modeBadge: `BALANCED · ${score}/100`,
    headline: "BALANCED MOMENTUM",
    explanation: "Moderate intra-hour range suitable for both 60s binary trades and perpetual positions.",
    actionText: "Dual Mode Ready",
    accentColor: "#D6FF3F",
  };
}
