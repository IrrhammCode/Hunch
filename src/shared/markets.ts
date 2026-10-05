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
  {
    symbol: "MON",
    pair: "MON-USD",
    label: "MON / USD",
    feedId: "0x31491744e2dbf6df7fcf4ac0820d18a609b49076d45066d3568424e62f686cd1",
    expo: -8,
  },
  {
    symbol: "DOGE",
    pair: "DOGE-USD",
    label: "DOGE / USD",
    feedId: "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
    expo: -8,
  },
  {
    symbol: "SUI",
    pair: "SUI-USD",
    label: "SUI / USD",
    feedId: "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
    expo: -8,
  },
  {
    symbol: "AVAX",
    pair: "AVAX-USD",
    label: "AVAX / USD",
    feedId: "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
    expo: -8,
  },
  {
    symbol: "LINK",
    pair: "LINK-USD",
    label: "LINK / USD",
    feedId: "0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
    expo: -8,
  },
  {
    symbol: "NEAR",
    pair: "NEAR-USD",
    label: "NEAR / USD",
    feedId: "0xc415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750",
    expo: -8,
  },
  {
    symbol: "PEPE",
    pair: "PEPE-USD",
    label: "PEPE / USD",
    feedId: "0xd69731a2e74ac1ce884fc3890f7ee324b6deb66147055249568869ed700882e4",
    expo: -8,
  },
  {
    symbol: "BNB",
    pair: "BNB-USD",
    label: "BNB / USD",
    feedId: "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
    expo: -8,
  },
  {
    symbol: "XRP",
    pair: "XRP-USD",
    label: "XRP / USD",
    feedId: "0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
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
