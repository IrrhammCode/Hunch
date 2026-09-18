/** Multi-asset markets on Monad hub — Pyth feed ids + UI metadata. */
export type MarketMeta = {
  symbol: string; // BTC
  pair: string; // BTC-USD
  label: string; // BTC / USD
  feedId: string; // bytes32 hex
  expo: number; // Pyth expo display
};

export const MARKETS: MarketMeta[] = [
  {
    symbol: "BTC",
    pair: "BTC-USD",
    label: "BTC / USD",
    feedId: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    expo: -8,
  },
  {
    symbol: "ETH",
    pair: "ETH-USD",
    label: "ETH / USD",
    feedId: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    expo: -8,
  },
  {
    symbol: "SOL",
    pair: "SOL-USD",
    label: "SOL / USD",
    feedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    expo: -8,
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
