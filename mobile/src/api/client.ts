import { USE_MOCK } from "@/src/config/chain";
import {
  mockCurrentRound,
  mockFaucet,
  mockMarketBoard,
  mockPerplAccount,
  mockPerplMarkets,
  mockPerplRisk,
  mockPriceHistory,
  mockPriceLatest,
  mockSponsors,
  mockTradeFill,
  mockWallet,
  mockZerion,
  mockHash,
  closeMockPosition,
  reverseMockPosition,
  MOCK_ADDRESS_CHECKSUM,
} from "@/src/mock/fixtures";

// Hard-default: 100% real mode
const MOCK = false;

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || `${path} → ${res.status}`);
  return json;
}

async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || `${path} → ${res.status}`);
  return json;
}

export type CurrentRoundResponse = {
  round: {
    roundId: string;
    market: string;
    strike: string;
    expo: number;
    startTime: number;
    expiry: number;
    status: "open" | "resolved";
    yesWins?: boolean;
  } | null;
  spot?: { yes: string; no: string };
  timeRemaining?: number;
  error?: string;
};

export type WalletPosition = {
  roundId: string;
  market: string;
  yes: string;
  no: string;
  status: "open" | "resolved";
  yesWins?: boolean;
  redeemable: boolean;
  estimatedPayout: string;
};

export type WalletSnapshot = {
  address: string;
  ausd: string;
  mon: string;
  roundCount: number;
  positions: WalletPosition[];
  explorer: string;
};

export type CommitCalldata = {
  chainId: number;
  market: string;
  collateral: string;
  approve: { to: string; data: string; value: string };
  commit: { to: string; data: string; value: string; description: string };
};

export type ExecuteTradeResult = {
  mode: string;
  intentId: string;
  market: string;
  trader: string;
  side: string;
  sideLabel: string;
  roundId: string;
  amountAUSD: string;
  sharesOut: string;
  yes: string;
  no: string;
  executeTx: string;
  spot: { yes: string; no: string };
  explorer: string;
};

export type FaucetResult = {
  address: string;
  ausd: string;
  mon: string;
  mintTx?: string;
  monTx?: string;
  alreadyFunded?: boolean;
};

export function fetchCurrentRound(symbol?: string) {
  if (MOCK) {
    return Promise.resolve(mockCurrentRound(symbol) as CurrentRoundResponse);
  }
  const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
  return get<CurrentRoundResponse>(`/v1/round/current${q}`);
}

export function fetchRound(id: string) {
  if (USE_MOCK) {
    return Promise.resolve({
      round: { roundId: id, status: "open" as const, yesWins: undefined },
    });
  }
  return get<{
    round: {
      roundId: string;
      status: "open" | "resolved";
      yesWins?: boolean;
    } | null;
  }>(`/v1/round/${id}`);
}

export function fetchConfig() {
  if (USE_MOCK) {
    return Promise.resolve({
      chainId: 10143,
      duration: 60,
      vault: "0xe064D0B2edE1891ebD0F815eDADd45541c62C927",
      markets: [
        { symbol: "BTC", pair: "BTC-USD" },
        { symbol: "ETH", pair: "ETH-USD" },
        { symbol: "SOL", pair: "SOL-USD" },
      ],
      chains: [{ key: "monad", name: "Monad Testnet", chainId: 10143, settlementHub: true }],
    });
  }
  return get<{
    chainId: number;
    duration: number;
    vault: string | null;
    markets?: { symbol: string; pair: string }[];
    chains?: { key: string; name: string; chainId: number; settlementHub?: boolean }[];
  }>("/v1/config");
}

export type MarketBoardRow = {
  symbol: string;
  pair: string;
  label?: string;
  chain: string;
  chainId: number;
  settlementHub?: boolean;
  status: "open" | "resolved" | "waiting" | "unavailable";
  roundId: string | null;
  market: string | null;
  timeRemaining?: number;
  strike?: string;
  spot?: { yes: string; no: string };
  reason?: string;
  explorer?: string;
};

export type MarketBoard = {
  product: string;
  feature: string;
  settlement: string;
  chains: {
    key: string;
    name: string;
    chainId: number;
    settlementHub?: boolean;
    deployed?: boolean;
    explorer?: string;
  }[];
  markets: MarketBoardRow[];
};

export function fetchMarketBoard(chain?: string) {
  if (USE_MOCK) return Promise.resolve(mockMarketBoard() as unknown as MarketBoard);
  const q = chain ? `?chain=${encodeURIComponent(chain)}` : "";
  return get<MarketBoard>(`/v1/markets${q}`);
}

export type PriceHistory = {
  symbol: string;
  resolution: number;
  bars: { t: number; o: number; h: number; l: number; c: number; v: number }[];
  last?: number;
  source?: string;
  error?: string;
};

export type PriceLatest = {
  symbol: string;
  price: number;
  conf?: number;
  publishTime?: number;
  feedId?: string;
  error?: string;
};

export function fetchPriceLatest(symbol: string) {
  if (USE_MOCK) return Promise.resolve(mockPriceLatest(symbol) as PriceLatest);
  return get<PriceLatest>(`/v1/price/${symbol}`);
}

export function fetchPriceHistory(symbol: string, resolution = 1, bars = 90) {
  if (USE_MOCK) return Promise.resolve(mockPriceHistory(symbol, resolution, bars) as PriceHistory);
  return get<PriceHistory>(`/v1/price/${symbol}/history?resolution=${resolution}&bars=${bars}`);
}

export type CrossChainBook = {
  address: string;
  model: string;
  chains: {
    chain: string;
    chainName?: string;
    chainId: number;
    available?: boolean;
    settlementHub?: boolean;
    address?: string;
    ausd?: string;
    mon?: string;
    positions?: WalletPosition[];
    explorer?: string;
    error?: string;
    note?: string;
  }[];
};

export function fetchCrossChainBook(address: string) {
  if (USE_MOCK) {
    const w = mockWallet(address);
    return Promise.resolve({
      address,
      model: "mock design",
      chains: [
        {
          chain: "monad",
          chainName: "Monad Testnet",
          chainId: 10143,
          available: true,
          settlementHub: true,
          address,
          ausd: w.ausd,
          mon: w.mon,
          positions: w.positions,
          explorer: w.explorer,
        },
      ],
    });
  }
  return get<CrossChainBook>(`/v1/book/${address}`);
}

export type ZerionPortfolio = {
  address: string;
  configured: boolean;
  totalUSD: number | null;
  change1dUSD: number | null;
  change1dPct: number | null;
  byChain: Record<string, number>;
  byType: Record<string, number>;
  error?: string;
};

export function fetchZerionPortfolio(address: string) {
  if (USE_MOCK) return Promise.resolve(mockZerion(address) as ZerionPortfolio);
  return get<ZerionPortfolio>(`/v1/zerion/portfolio/${address}`);
}

export function fetchSponsorPerks() {
  if (USE_MOCK) return Promise.resolve(mockSponsors());
  return get<{
    quicknode: string;
    monadRpcHint: string;
    tenderly: string;
    zerion: string;
  }>("/v1/sponsors/status");
}

export function fetchWallet(address: string) {
  if (USE_MOCK) return Promise.resolve(mockWallet(address) as WalletSnapshot);
  return get<WalletSnapshot>(`/v1/wallet/${address}`);
}

export function walletFaucet(address: string, amountAUSD = "1000") {
  if (USE_MOCK) {
    return Promise.resolve(mockFaucet(address || MOCK_ADDRESS_CHECKSUM) as FaucetResult);
  }
  return post<FaucetResult>("/v1/wallet/faucet", { address, amountAUSD });
}

export function fetchCommitCalldata(
  side: "UP" | "DOWN" | "YES" | "NO",
  amountAUSD: string,
  symbol?: string,
) {
  if (USE_MOCK) {
    return Promise.resolve({
      chainId: 10143,
      market: `0xMockMarket${symbol || "BTC"}`,
      collateral: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC",
      approve: { to: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC", data: "0x", value: "0" },
      commit: { to: "0xMock", data: "0x", value: "0", description: "mock commit" },
    });
  }
  const normalized = side === "UP" ? "YES" : side === "DOWN" ? "NO" : side;
  return post<CommitCalldata>("/v1/tx/commit", { side: normalized, amountAUSD, symbol });
}

export function executeTrade(trader: string, intentId?: string, market?: string) {
  if (USE_MOCK) {
    return Promise.resolve({
      ...mockTradeFill("UP", "10", "BTC"),
      intentId: intentId || "1",
      market: market || "0xMock",
    } as ExecuteTradeResult);
  }
  return post<ExecuteTradeResult>("/v1/trade/execute", { trader, intentId, market });
}

export function fetchRedeemCalldata(market?: string) {
  if (USE_MOCK) {
    return Promise.resolve({
      to: market || "0xMock",
      data: "0x",
      value: "0",
      description: "mock redeem",
    });
  }
  return post<{ to: string; data: string; value: string; description: string }>("/v1/tx/redeem", {
    market,
  });
}

export function fetchQuote(side: "YES" | "NO", amountAUSD: string, market?: string) {
  if (USE_MOCK) {
    const amt = Number(amountAUSD) || 0;
    return Promise.resolve({
      side,
      amountIn: amountAUSD,
      feeAUSD: (amt * 0.01).toFixed(2),
      sharesOut: (amt * 1.85).toFixed(2),
      note: "mock CPMM quote",
    });
  }
  return post<{
    side: string;
    amountIn: string;
    feeAUSD: string;
    sharesOut: string;
    note?: string;
  }>("/v1/quote", { side, amountAUSD, market });
}

export type PerplMarket = {
  id: number;
  perpetualId: number;
  symbol: string;
  name: string;
  sizeUnits: string;
  markPrice: number;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  change24hPct: number;
  volume24hAUSD: number;
  openInterest: number;
  fundingRateBps: number;
  maxLeverage: number;
  priceDecimals: number;
  sizeDecimals: number;
};

export type PerplPosition = {
  id: string;
  trader: string;
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  sizeAUSD: number;
  entryPrice: number;
  markPrice?: number;
  leverage: number;
  marginAUSD: number;
  liquidationPrice: number;
  unrealizedPnLAUSD?: number;
  unrealizedPnLPct?: number;
  openedAt: number;
  status: "OPEN" | "CLOSED";
  realizedPnL?: number;
  realizedPnLAUSD?: number;
  closedAt?: number;
  closedPrice?: number;
  tpPrice?: number;
  slPrice?: number;
  closeReason?: string;
};

export type PerplAccount = {
  address: string;
  exchange: string;
  collateralToken: string;
  marginUsedAUSD: number;
  unrealizedPnLAUSD: number;
  openPositionsCount: number;
  positions: PerplPosition[];
  accountId?: number;
  authConfigured?: boolean;
  execution?: string;
  onchainCollateralAUSD?: string;
};

export async function fetchPerplMarkets(): Promise<{ markets: PerplMarket[]; context: any }> {
  if (USE_MOCK) return mockPerplMarkets() as any;
  return get<{ markets: PerplMarket[]; context: any }>(`/v1/perpl/markets`);
}

export async function fetchPerplAccount(address: string): Promise<PerplAccount> {
  if (USE_MOCK) return mockPerplAccount(address) as any;
  return get<PerplAccount>(`/v1/perpl/account/${address}`);
}

export type PerplRiskReport = {
  address: string;
  authConfigured: boolean;
  accountId: number | null;
  collateralAUSD: number;
  marginUsedAUSD: number;
  freeMarginAUSD: number;
  unrealizedPnLAUSD: number;
  openNotionalAUSD: number;
  effectiveLeverage: number;
  maxPositionLeverage: number;
  openCount: number;
  longCount: number;
  shortCount: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "FLAT";
  warnings: string[];
  positions: (PerplPosition & {
    notionalAUSD: number;
    liqDistancePct: number | null;
  })[];
  marketMarks?: { symbol: string; markPrice: number; change24hPct: number }[];
  source?: string;
};

export function fetchPerplRisk(address: string) {
  if (MOCK) {
    return Promise.resolve(mockPerplRisk(address) as unknown as PerplRiskReport);
  }
  return get<PerplRiskReport>(`/v1/perpl/risk/${address}`);
}

export function placePerplOrder(params: {
  trader: string;
  symbol: string;
  side: "LONG" | "SHORT";
  marginAUSD: number;
  leverage: number;
  accountId?: number;
  tpPrice?: number;
  slPrice?: number;
}) {
  if (USE_MOCK) {
    const mk = mockPerplMarkets().markets.find(
      (m) => m.symbol === params.symbol,
    ) || mockPerplMarkets().markets[0]!;
    const position: PerplPosition = {
      id: `mock_${Date.now()}`,
      trader: params.trader,
      symbol: params.symbol,
      side: params.side,
      size: params.marginAUSD * params.leverage / mk.markPrice,
      sizeAUSD: params.marginAUSD * params.leverage,
      entryPrice: mk.markPrice,
      markPrice: mk.markPrice,
      leverage: params.leverage,
      marginAUSD: params.marginAUSD,
      liquidationPrice: mk.markPrice * (params.side === "LONG" ? 0.9 : 1.1),
      unrealizedPnLAUSD: 0,
      openedAt: Date.now(),
      status: "OPEN",
      tpPrice: params.tpPrice,
      slPrice: params.slPrice,
    };
    return Promise.resolve({
      success: true,
      execution: "mock-design",
      position,
      market: mk,
    });
  }
  return post<{
    success: boolean;
    execution?: string;
    position: PerplPosition;
    market: PerplMarket;
  }>("/v1/perpl/order", params);
}

export function updatePerplPositionGuards(
  positionId: string,
  trader: string,
  guards: { tpPrice?: number | null; slPrice?: number | null }
) {
  if (USE_MOCK) {
    return Promise.resolve({
      success: true,
      position: {
        id: positionId,
        tpPrice: guards.tpPrice ?? undefined,
        slPrice: guards.slPrice ?? undefined,
      } as any,
    });
  }
  return post<{ success: boolean; position: PerplPosition }>("/v1/perpl/position/guards", {
    positionId,
    trader,
    ...guards,
  });
}

export function linkPerplAccount(address: string, accountId: number) {
  if (USE_MOCK) return Promise.resolve({ address: address.toLowerCase(), accountId });
  return post<{ address: string; accountId: number }>("/v1/perpl/account-link", {
    address,
    accountId,
  });
}

export function closePerplPosition(
  positionId: string,
  trader: string,
  fallback?: Partial<PerplPosition>,
) {
  if (USE_MOCK) {
    const mockPos = closeMockPosition(positionId);
    return Promise.resolve({
      success: true,
      position: mockPos || {
        id: positionId,
        trader,
        symbol: fallback?.symbol || "BTC",
        side: fallback?.side || "LONG",
        size: fallback?.size || 0,
        sizeAUSD: fallback?.sizeAUSD || 0,
        entryPrice: fallback?.entryPrice || 0,
        leverage: fallback?.leverage || 1,
        marginAUSD: fallback?.marginAUSD || 0,
        liquidationPrice: 0,
        openedAt: Date.now(),
        status: "CLOSED" as const,
      },
      realizedPnL: mockPos?.realizedPnLAUSD ?? 5.5,
    });
  }
  return post<{ success: boolean; position: PerplPosition; realizedPnL: number }>("/v1/perpl/order/close", {
    positionId,
    trader,
    ...fallback,
  });
}

export function reversePerplPosition(
  positionId: string,
  trader: string,
  fallback?: Partial<PerplPosition>,
) {
  if (USE_MOCK) {
    const reversed = reverseMockPosition(positionId);
    const prevSide = fallback?.side || "LONG";
    const nextSide = prevSide === "LONG" ? "SHORT" : "LONG";
    return Promise.resolve({
      success: true,
      closedPosition: {
        id: positionId,
        trader,
        symbol: fallback?.symbol || "BTC",
        side: prevSide,
        size: fallback?.size || 0,
        sizeAUSD: fallback?.sizeAUSD || 0,
        entryPrice: fallback?.entryPrice || 0,
        leverage: fallback?.leverage || 1,
        marginAUSD: fallback?.marginAUSD || 0,
        liquidationPrice: 0,
        openedAt: Date.now(),
        status: "CLOSED" as const,
      },
      newPosition: reversed || {
        id: `rev_${Date.now()}`,
        trader,
        symbol: fallback?.symbol || "BTC",
        side: nextSide,
        size: fallback?.size || 0.0025,
        sizeAUSD: fallback?.sizeAUSD || 20,
        entryPrice: fallback?.entryPrice || 83000,
        leverage: fallback?.leverage || 10,
        marginAUSD: fallback?.marginAUSD || 20,
        liquidationPrice: 0,
        openedAt: Date.now(),
        status: "OPEN" as const,
      },
      realizedPnL: 4.8,
    });
  }
  return post<{
    success: boolean;
    closedPosition: PerplPosition;
    newPosition: PerplPosition;
    realizedPnL: number;
  }>("/v1/perpl/order/reverse", {
    positionId,
    trader,
    ...fallback,
  });
}

export function fetchPerplDepositCalldata(amountAUSD: number, address: string) {
  if (USE_MOCK) {
    return Promise.resolve({
      chainId: 10143,
      exchange: "0x1964C32f0bE608E7D29302AFF5E61268E72080cc",
      token: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC",
      amountAUSD,
      minAccountOpenAUSD: 100,
      accountId: 644,
      action: "deposit",
      approve: { to: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC", data: "0x", value: "0" },
      deposit: { to: "0x1964C32f0bE608E7D29302AFF5E61268E72080cc", data: "0x", value: "0" },
    });
  }
  return post<any>("/v1/perpl/tx/deposit", { amountAUSD, address });
}

export function fetchPerplWithdrawCalldata(amountAUSD: number, address: string) {
  if (USE_MOCK) {
    return Promise.resolve({
      chainId: 10143,
      exchange: "0x1964C32f0bE608E7D29302AFF5E61268E72080cc",
      amountAUSD,
      accountId: 644,
      withdraw: { to: "0x1964C32f0bE608E7D29302AFF5E61268E72080cc", data: "0x", value: "0" },
    });
  }
  return post<any>("/v1/perpl/tx/withdraw", { amountAUSD, address });
}

export function relayDepositMargin(amountAUSD: number, address: string) {
  if (USE_MOCK) {
    return Promise.resolve({
      success: true,
      txHash: "0xmockRelayedDeposit" + Date.now().toString(16),
      action: "deposit",
      accountId: 644,
      amountAUSD,
      address,
    });
  }
  return post<{
    success: boolean;
    txHash: string;
    action: string;
    accountId?: number;
    amountAUSD: number;
    address: string;
  }>("/v1/perpl/margin/deposit", { amountAUSD, address });
}

export function executeHedgeForHunch(params: {
  trader: string;
  symbol: string;
  hunchSide: "UP" | "DOWN";
  hunchAmountAUSD: number;
  hedgeRatio?: number;
  leverage?: number;
}) {
  if (USE_MOCK) {
    const oppSide = params.hunchSide === "UP" ? "SHORT" : "LONG";
    const hedgeMargin = Math.max(5, Number((params.hunchAmountAUSD * (params.hedgeRatio || 0.5)).toFixed(2)));
    return Promise.resolve({
      success: true,
      hunchSide: params.hunchSide,
      perpSide: oppSide,
      hedgeRatio: params.hedgeRatio || 0.5,
      hedgeMarginAUSD: hedgeMargin,
      position: {
        id: `hedge_${Date.now()}`,
        trader: params.trader,
        symbol: params.symbol,
        side: oppSide,
        size: 0.001,
        sizeAUSD: hedgeMargin * 2,
        entryPrice: 84000,
        leverage: 2,
        marginAUSD: hedgeMargin,
        liquidationPrice: 0,
        openedAt: Date.now(),
        status: "OPEN" as const,
      },
    });
  }
  return post<{
    success: boolean;
    hunchSide: string;
    perpSide: "LONG" | "SHORT";
    hedgeRatio: number;
    hedgeMarginAUSD: number;
    position: PerplPosition;
    market: any;
    perpl: any;
  }>("/v1/perpl/hedge/hunch", params);
}

export function mockTradeResult(side: string, amountAUSD: string, symbol: string) {
  return mockTradeFill(side, amountAUSD, symbol);
}

export { API_URL, USE_MOCK, mockHash };
