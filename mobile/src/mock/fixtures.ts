/**
 * Design-time fixtures — FULL MOCK until Tenderly/real stack is ready.
 * Clearly labeled mock; never used when EXPO_PUBLIC_USE_MOCK!=1.
 */

export const MOCK_ADDRESS = "0x8f2a4E9a1b3C5d7E9f0A1b2C3d4E5f67890abcde";
export const MOCK_ADDRESS_CHECKSUM = "0x8f2a4E9a1b3C5d7E9f0A1b2C3d4E5f67890abcde";

const now = () => Math.floor(Date.now() / 1000);

export const MOCK_PRICES: Record<string, number> = {
  BTC: 81240.5,
  ETH: 2655.2,
  SOL: 148.35,
  MON: 0.42,
  ZEC: 42.8,
  LIT: 1.24,
  PUMP: 0.0042,
};

/** Deterministic series so charts look stable between remounts. */
function walkSeries(symbol: string, bars: number, resolutionMin: number) {
  const s = symbol.toUpperCase();
  const base = MOCK_PRICES[s] ?? 100;
  const n = Math.max(24, Math.min(bars || 90, 120));
  const pts: { t: number; o: number; h: number; l: number; c: number; v: number }[] = [];
  let p = base * 0.978;
  const t0 = now() - n * resolutionMin * 60;
  for (let i = 0; i < n; i++) {
    const wave = Math.sin(i / 5.5 + s.length) * base * 0.004 + Math.cos(i / 11) * base * 0.0025;
    const trend = ((i / n) * 0.022 - 0.008) * base;
    const target = base + wave + trend * 0.15;
    const o = p;
    p = p + (target - p) * 0.18 + Math.sin(i * 1.7 + s.charCodeAt(0)) * base * 0.0008;
    const c = p;
    const h = Math.max(o, c) * 1.0012;
    const l = Math.min(o, c) * 0.9988;
    pts.push({
      t: t0 + i * Math.max(1, resolutionMin) * 60,
      o,
      h,
      l,
      c,
      v: 55 + ((Math.abs(c - o) / base) * 8000) + (i % 7) * 3,
    });
  }
  // pin last close near mock last
  const last = pts[pts.length - 1]!;
  last.c = base;
  last.h = Math.max(last.h, base);
  last.l = Math.min(last.l, base);
  return pts;
}

export function mockSeries(symbol: string, bars = 48) {
  return walkSeries(symbol, bars, 1);
}

export function mockPriceLatest(symbol: string) {
  const s = symbol.toUpperCase();
  return {
    symbol: s,
    price: MOCK_PRICES[s] ?? 100,
    conf: (MOCK_PRICES[s] ?? 100) * 0.0001,
    expo: -8,
    publishTime: now(),
    feedId: `mock-${s}`,
  };
}

export function mockPriceHistory(symbol: string, resolution = 1, bars = 90) {
  const s = symbol.toUpperCase();
  const series = walkSeries(s, bars, resolution);
  return {
    symbol: s,
    resolution: resolution || 1,
    bars: series,
    last: series[series.length - 1]?.c ?? MOCK_PRICES[s] ?? 100,
    source: "mock-design",
  };
}

export function mockMarketBoard() {
  const mk = (symbol: string, status: "open" | "resolved" | "waiting", round: string, yes: number) => ({
    symbol,
    pair: `${symbol}-USD`,
    label: `${symbol} / USD`,
    chain: "monad",
    chainName: "Monad Testnet",
    chainId: 10143,
    settlementHub: true,
    explorer: "https://testnet.monadvision.com",
    roundId: round,
    market: `0xMockMarket${symbol}${round}`.slice(0, 42),
    status,
    strike: String(Math.round((MOCK_PRICES[symbol] ?? 100) * 1e8)),
    expo: -8,
    expiry: now() + (status === "open" ? 42 : -10),
    timeRemaining: status === "open" ? 42 : 0,
    spot: { yes: String(yes), no: String(1 - yes) },
    reason: status === "waiting" ? "keeper opening" : undefined,
  });

  return {
    product: "Hunch — MOCK design mode",
    feature: "short-horizon UP/DOWN markets",
    settlement: "Monad hub (fixtures)",
    chains: [
      { key: "monad", name: "Monad Testnet", chainId: 10143, settlementHub: true, deployed: true, explorer: "https://testnet.monadvision.com" },
    ],
    markets: [
      mk("BTC", "open", "1842", 0.56),
      mk("ETH", "open", "1843", 0.44),
      mk("SOL", "open", "1844", 0.61),
    ],
  };
}

export function mockPerplMarkets() {
  const mk = (id: number, symbol: string, mark: number, chg: number, lev = 20) => ({
    id,
    perpetualId: id,
    symbol,
    name: `${symbol} Perp`,
    sizeUnits: symbol,
    markPrice: mark,
    lastPrice: mark * (1 + chg / 200),
    bidPrice: mark * 0.9995,
    askPrice: mark * 1.0005,
    change24hPct: chg,
    volume24hAUSD: 1_200_000 + id * 40_000,
    openInterest: 4200 + id * 120,
    fundingRateBps: 12,
    maxLeverage: lev,
    priceDecimals: 2,
    sizeDecimals: 2,
  });
  return {
    markets: [
      mk(16, "BTC", MOCK_PRICES.BTC!, -1.02),
      mk(32, "ETH", MOCK_PRICES.ETH!, 0.84),
      mk(48, "SOL", MOCK_PRICES.SOL!, 2.15),
      mk(64, "MON", MOCK_PRICES.MON!, 3.4),
      mk(256, "ZEC", MOCK_PRICES.ZEC!, -0.55),
      mk(300, "LIT", MOCK_PRICES.LIT!, 1.2),
      mk(400, "PUMP", MOCK_PRICES.PUMP!, 5.8),
    ],
    context: {
      chainId: 10143,
      collateralToken: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC",
      exchange: "0x1964C32f0bE608E7D29302AFF5E61268E72080cc",
      minAccountOpenAUSD: 100,
    },
  };
}

export function mockWallet(address?: string) {
  return {
    address: address || MOCK_ADDRESS_CHECKSUM,
    ausd: "2450.00",
    mon: "1.250",
    roundCount: 12,
    positions: [
      {
        roundId: "1840",
        market: "0xMockMarketBTC1840",
        yes: "25",
        no: "0",
        status: "resolved" as const,
        yesWins: true,
        redeemable: true,
        estimatedPayout: "46.25",
      },
      {
        roundId: "1842",
        market: "0xMockMarketBTC1842",
        yes: "10",
        no: "0",
        status: "open" as const,
        redeemable: false,
        estimatedPayout: "0",
      },
    ],
    explorer: "https://testnet.monadvision.com",
  };
}

export function mockPerplAccount(address: string) {
  return {
    address,
    exchange: "0x1964C32f0bE608E7D29302AFF5E61268E72080cc",
    collateralToken: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC",
    accountId: 644,
    authConfigured: true,
    execution: "mock-design" as const,
    marginUsedAUSD: 80,
    unrealizedPnLAUSD: 12.4,
    openPositionsCount: 2,
    onchainCollateralAUSD: "2450",
    positions: [
      {
        id: "mock_perp_btc",
        trader: address,
        symbol: "BTC",
        side: "LONG" as const,
        size: 0.0025,
        sizeAUSD: 20,
        entryPrice: MOCK_PRICES.BTC! * 0.992,
        markPrice: MOCK_PRICES.BTC,
        leverage: 10,
        marginAUSD: 20,
        liquidationPrice: MOCK_PRICES.BTC! * 0.9,
        unrealizedPnLAUSD: 8.2,
        unrealizedPnLPct: 4.1,
        openedAt: Date.now() - 3600_000,
        status: "OPEN" as const,
      },
      {
        id: "mock_perp_eth",
        trader: address,
        symbol: "ETH",
        side: "SHORT" as const,
        size: 0.03,
        sizeAUSD: 60,
        entryPrice: MOCK_PRICES.ETH! * 1.008,
        markPrice: MOCK_PRICES.ETH,
        leverage: 5,
        marginAUSD: 60,
        liquidationPrice: MOCK_PRICES.ETH! * 1.08,
        unrealizedPnLAUSD: 4.2,
        unrealizedPnLPct: 3.5,
        openedAt: Date.now() - 7200_000,
        status: "OPEN" as const,
      },
    ],
  };
}

export function mockCurrentRound(symbol = "BTC") {
  const s = (symbol || "BTC").toUpperCase();
  const strike = MOCK_PRICES[s] ?? 100;
  return {
    round: {
      roundId: "1842",
      market: `0xMockMarket${s}1842`,
      strike: String(Math.round(strike * 1e8)),
      expo: 8,
      startTime: now() - 15,
      expiry: now() + 45,
      status: "open" as const,
    },
    spot: { yes: "0.56", no: "0.44" },
    timeRemaining: 45,
  };
}

export function mockFaucet(address: string) {
  return {
    address,
    ausd: "3450.00",
    mon: "1.250",
    mintTx: `0xmockfaucet${Date.now().toString(16)}`,
    monTx: `0xmockmon${Date.now().toString(16)}`,
    alreadyFunded: false,
    mintedAUSD: "1000",
  };
}

export function mockSponsors() {
  return {
    quicknode: "mock",
    monadRpcHint: "MOCK design mode",
    tenderly: "pending-perk",
    zerion: "mock",
    perplKeys: "mock",
    quicknodeEndpoints: 0,
    quicknodeSurfaces: { api: false, keeper: false, indexer: false, hardhat: false, wss: false },
  };
}

export function mockZerion(address: string) {
  return {
    address,
    configured: true,
    totalUSD: 4820.5,
    change1dUSD: 62.1,
    change1dPct: 1.31,
    byChain: { monad: 3200, base: 980, ethereum: 640.5 },
    byType: { wallet: 2450, deposited: 2370.5 },
    source: "mock-design",
  };
}

export function mockHash() {
  return `0x${Math.random().toString(16).slice(2).padEnd(64, "0").slice(0, 64)}`;
}

export function mockTradeFill(side: string, amountAUSD: string, symbol: string, roundId = "1842") {
  return {
    mode: "mock-design",
    trader: MOCK_ADDRESS_CHECKSUM,
    roundId,
    market: `0xMockMarket${symbol}${roundId}`,
    side,
    sideLabel: side,
    amountAUSD,
    yes: side === "UP" ? amountAUSD : "0",
    no: side === "DOWN" ? amountAUSD : "0",
    sharesOut: String(Number(amountAUSD) * 1.85),
    executeTx: mockHash(),
    spot: { yes: "0.56", no: "0.44" },
    explorer: "https://testnet.monadvision.com",
  };
}
