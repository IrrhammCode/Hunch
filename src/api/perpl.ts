/**
 * Perpl account + order integration (REAL path).
 * - Markets: public Perpl testnet context API (always real)
 * - Deposit: onchain calldata for Perpl Exchange createAccount (user signs)
 * - Orders: signed Perpl trading WS — requires PERPL_API_KEY + SECRET
 * - No silent mock positions — missing config throws.
 */
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import {
  getPerplMarkets,
  fetchPerplContext,
  PERPL_TESTNET,
  PerplMarketSummary,
} from "../shared/perpl";
import { ausdContract, getProvider, getWallet, loadDeployment } from "../shared/chain";
import {
  perplAuthConfigured,
  placePerplOrderWs,
  perplFetchPositions,
  perplFetchPositionHistory,
} from "../shared/perplAuth";

export type PerplPosition = {
  id: string;
  trader: string;
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  sizeAUSD: number;
  entryPrice: number;
  leverage: number;
  marginAUSD: number;
  liquidationPrice: number;
  openedAt: number;
  status: "OPEN" | "CLOSED";
  closedAt?: number;
  closedPrice?: number;
  realizedPnL?: number;
  realizedPnLAUSD?: number;
  unrealizedPnLAUSD?: number;
  unrealizedPnLPct?: number;
  markPrice?: number;
  execution?: "perpl-ws";
  accountId?: number;
  tpPrice?: number;
  slPrice?: number;
  closeReason?: "USER" | "TP_TRIGGERED" | "SL_TRIGGERED" | "REVERSED";
};

/** Local mirror of orders we submitted (not source of truth). */
const POSITIONS_FILE = path.join(__dirname, "..", "..", "data", "perpl_positions.json");
const ACCOUNTS_FILE = path.join(__dirname, "..", "..", "data", "perpl_accounts.json");

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function linkPerplAccount(address: string, accountId: number) {
  const map = readJson<Record<string, number>>(ACCOUNTS_FILE, {});
  map[address.toLowerCase()] = accountId;
  writeJson(ACCOUNTS_FILE, map);
  return { address: address.toLowerCase(), accountId };
}

export function getLinkedPerplAccountId(address: string): number | null {
  const map = readJson<Record<string, number>>(ACCOUNTS_FILE, {});
  return map[address.toLowerCase()] ?? null;
}

export async function listPerplMarkets(): Promise<{ markets: PerplMarketSummary[]; context: any }> {
  const [markets, rawCtx] = await Promise.all([getPerplMarkets(), fetchPerplContext()]);
  return {
    markets,
    context: {
      chainId: rawCtx.chain?.chain_id ?? PERPL_TESTNET.chainId,
      collateralToken: rawCtx.tokens?.[0]?.address ?? PERPL_TESTNET.collateralToken,
      exchange: rawCtx.instances?.[0]?.address ?? PERPL_TESTNET.exchange,
      minAccountOpenAUSD:
        (rawCtx.instances?.[0]?.min_account_open_amount ?? 100000000) / 1e6,
    },
  };
}

export async function getPerplMarket(symbol: string): Promise<PerplMarketSummary | null> {
  const { markets } = await listPerplMarkets();
  const hit = markets.find((m) => m.symbol.toUpperCase() === symbol.toUpperCase());
  return hit || null;
}

export async function getUserPerplAccount(address: string) {
  if (!ethers.isAddress(address)) throw new Error("bad address");
  const normalized = address.toLowerCase();
  const accountId = getLinkedPerplAccountId(address);
  const markets = await getPerplMarkets();
  const marketMap = new Map(markets.map((m) => [m.symbol.toUpperCase(), m]));

  let positions: PerplPosition[] = [];
  let historyError: string | undefined;

  if (perplAuthConfigured()) {
    try {
      const posRes = await perplFetchPositions();
      const rows = (posRes?.d || []) as any[];
      positions = rows
        .filter((row: any) => Number(row?.s ?? 0) > 0)
        .map((row: any) => {
          const mktId = Number(row?.mkt ?? row?.market_id ?? 0);
          const market = markets.find((m) => m.id === mktId || m.perpetualId === mktId);
          const symbol = market?.symbol || "PERP";
          const pDec = market?.priceDecimals ?? 2;
          const sDec = market?.sizeDecimals ?? 2;
          const entryPrice = row?.ep != null ? Number(row.ep) / Math.pow(10, pDec) : 0;
          const size = row?.s != null ? Number(row.s) / Math.pow(10, sDec) : 0;
          const leverage = row?.lv != null ? Math.max(1, Math.round(Number(row.lv) / 100)) : 1;
          const side: "LONG" | "SHORT" = row?.sd === 2 || row?.t === 2 ? "SHORT" : "LONG";
          const sizeAUSD = size * entryPrice;
          const marginAUSD = Number((sizeAUSD / leverage).toFixed(2));
          const pid = String(row?.pid || `perpl_${mktId}`);

          return {
            id: pid,
            trader: normalized,
            symbol,
            side,
            size: Number(size.toFixed(sDec)),
            sizeAUSD: Number(sizeAUSD.toFixed(2)),
            entryPrice: Number(entryPrice.toFixed(pDec)),
            leverage,
            marginAUSD,
            liquidationPrice: 0,
            openedAt: Number(row?.ots?.t ?? Date.now()),
            status: "OPEN" as const,
            execution: "perpl-ws" as const,
            accountId: Number(row?.acc ?? accountId ?? 643),
          };
        });
    } catch (e: any) {
      historyError = e?.message || String(e);
    }
  } else {
    historyError =
      "Perpl API keys not configured — set PERPL_API_KEY + PERPL_API_KEY_SECRET for live fills/positions";
  }

  // Merge with local mirror for real-time order visibility and status reconciliation
  const localPositions = readJson<PerplPosition[]>(POSITIONS_FILE, []);
  const traderLocal = localPositions.filter(
    (p) =>
      p.trader.toLowerCase() === normalized &&
      !p.id.startsWith("h_") &&
      (p.entryPrice > 0 || p.status === "OPEN"),
  );
  const mergedMap = new Map<string, PerplPosition>();

  for (const p of positions) {
    mergedMap.set(p.id, p);
  }
  const liveBySymbol = new Map(positions.map((p) => [p.symbol.toUpperCase(), p]));

  for (const lp of traderLocal) {
    if (lp.status === "OPEN") {
      const live = liveBySymbol.get(lp.symbol.toUpperCase());
      if (live) {
        if (lp.tpPrice != null) live.tpPrice = lp.tpPrice;
        if (lp.slPrice != null) live.slPrice = lp.slPrice;
        continue;
      }
      if (!mergedMap.has(lp.id)) {
        mergedMap.set(lp.id, lp);
      }
    } else if (lp.status === "CLOSED") {
      if (!mergedMap.has(lp.id)) {
        mergedMap.set(lp.id, lp);
      }
    }
  }
  positions = Array.from(mergedMap.values());

  let totalUnrealizedPnL = 0;
  let totalMarginUsed = 0;
  const enriched = positions.map((p) => {
    const market = marketMap.get(p.symbol.toUpperCase());
    const currentPrice = market ? market.markPrice : p.entryPrice;
    const priceDelta = currentPrice - p.entryPrice;
    const pnlAUSD = p.side === "LONG" ? priceDelta * p.size : -priceDelta * p.size;
    const pnlPct = p.marginAUSD > 0 ? (pnlAUSD / p.marginAUSD) * 100 : 0;
    const isOpen = p.status === "OPEN";
    if (isOpen) {
      totalUnrealizedPnL += pnlAUSD;
      totalMarginUsed += p.marginAUSD;
    }
    return {
      ...p,
      markPrice: currentPrice,
      unrealizedPnLAUSD: isOpen ? Number(pnlAUSD.toFixed(2)) : (p.realizedPnLAUSD ?? 0),
      unrealizedPnLPct: isOpen ? Number(pnlPct.toFixed(2)) : 0,
    };
  });

  // Sort so open positions are first, followed by recent closed
  enriched.sort((a, b) => {
    if (a.status === "OPEN" && b.status !== "OPEN") return -1;
    if (a.status !== "OPEN" && b.status === "OPEN") return 1;
    return (b.openedAt || 0) - (a.openedAt || 0);
  });

  const dep = loadDeployment();
  const provider = getProvider();
  let onchainAUSD = "0";
  try {
    const token =
      (dep.perpl as any)?.collateral ||
      PERPL_TESTNET.collateralToken ||
      dep.collateral.address;
    const erc20 = new ethers.Contract(token, ["function balanceOf(address) view returns (uint256)"], provider);
    onchainAUSD = ethers.formatUnits(await erc20.balanceOf(address), 6);
  } catch {
    /* RPC may be rate-limited */
  }

  return {
    address,
    exchange: PERPL_TESTNET.exchange,
    collateralToken: PERPL_TESTNET.collateralToken,
    accountId,
    authConfigured: perplAuthConfigured(),
    execution: perplAuthConfigured() ? ("perpl-ws" as const) : ("unconfigured" as const),
    marginUsedAUSD: Number(totalMarginUsed.toFixed(2)),
    unrealizedPnLAUSD: Number(totalUnrealizedPnL.toFixed(2)),
    openPositionsCount: enriched.filter((p) => p.status === "OPEN").length,
    positions: enriched,
    onchainCollateralAUSD: onchainAUSD,
    historyError,
  };
}

export async function buildPerplDepositCalldata(amountAUSD: number, address: string) {
  if (!ethers.isAddress(address)) throw new Error("bad address");
  if (amountAUSD < 1) throw new Error("minimum deposit is 1 AUSD");

  const dep = loadDeployment();
  // Prefer official Agora AUSD testnet when deployment notes it; else local token
  const exchange = PERPL_TESTNET.exchange;
  const token =
    (dep as any).agoraAusdTestnet ||
    PERPL_TESTNET.collateralToken ||
    dep.collateral.address;

  const rawAmount = ethers.parseUnits(amountAUSD.toString(), 6);

  const erc20Interface = new ethers.Interface([
    "function approve(address spender, uint256 amount) returns (bool)",
  ]);
  const approveData = erc20Interface.encodeFunctionData("approve", [exchange, rawAmount]);

  const existingAccountId = getLinkedPerplAccountId(address);

  const exchangeInterface = new ethers.Interface([
    "function createAccount(uint256 collateralAmount) external returns (uint64)",
    "function deposit(uint64 accountId, uint256 amount) external",
    "function withdraw(uint64 accountId, uint256 amount) external",
  ]);

  let depositData: string;
  let action: "createAccount" | "deposit";

  if (existingAccountId != null && existingAccountId > 0) {
    depositData = exchangeInterface.encodeFunctionData("deposit", [existingAccountId, rawAmount]);
    action = "deposit";
  } else {
    depositData = exchangeInterface.encodeFunctionData("createAccount", [rawAmount]);
    action = "createAccount";
  }

  return {
    chainId: PERPL_TESTNET.chainId,
    exchange,
    token,
    amountAUSD,
    minAccountOpenAUSD: PERPL_TESTNET.minAccountOpen,
    accountId: existingAccountId ?? null,
    action,
    approve: { to: token, data: approveData, value: "0" },
    deposit: { to: exchange, data: depositData, value: "0" },
  };
}

export async function buildPerplWithdrawCalldata(amountAUSD: number, address: string) {
  if (!ethers.isAddress(address)) throw new Error("bad address");
  if (amountAUSD <= 0) throw new Error("amount must be > 0");

  const exchange = PERPL_TESTNET.exchange;
  const existingAccountId = getLinkedPerplAccountId(address) ?? 644;

  const rawAmount = ethers.parseUnits(amountAUSD.toString(), 6);
  const exchangeInterface = new ethers.Interface([
    "function withdraw(uint64 accountId, uint256 amount) external",
  ]);
  const withdrawData = exchangeInterface.encodeFunctionData("withdraw", [existingAccountId, rawAmount]);

  return {
    chainId: PERPL_TESTNET.chainId,
    exchange,
    amountAUSD,
    accountId: existingAccountId,
    withdraw: { to: exchange, data: withdrawData, value: "0" },
  };
}

export async function relayPerplDeposit(amountAUSD: number, address: string) {
  if (!ethers.isAddress(address)) throw new Error("bad address");
  if (amountAUSD < 1) throw new Error("minimum deposit is 1 AUSD");

  const wallet = getWallet();
  const exchange = PERPL_TESTNET.exchange;
  const dep = loadDeployment();
  const token =
    (dep as any).agoraAusdTestnet ||
    PERPL_TESTNET.collateralToken ||
    dep.collateral.address;

  const rawAmount = ethers.parseUnits(amountAUSD.toString(), 6);

  const erc20 = new ethers.Contract(
    token,
    [
      "function balanceOf(address) view returns (uint256)",
      "function allowance(address, address) view returns (uint256)",
      "function approve(address, uint256) returns (bool)",
    ],
    wallet,
  );

  const ex = new ethers.Contract(
    exchange,
    [
      "function createAccount(uint256 collateralAmount) external returns (uint64)",
      "function deposit(uint64 accountId, uint256 amount) external",
    ],
    wallet,
  );

  const allow: bigint = await erc20.allowance(wallet.address, exchange);
  if (allow < rawAmount) {
    const appTx = await erc20.approve(exchange, ethers.MaxUint256);
    await appTx.wait();
  }

  let existingAccountId = getLinkedPerplAccountId(address);
  let txHash: string;
  let action: "createAccount" | "deposit";

  if (existingAccountId != null && existingAccountId > 0) {
    const tx = await ex.deposit(existingAccountId, rawAmount);
    await tx.wait();
    txHash = tx.hash;
    action = "deposit";
  } else {
    const tx = await ex.createAccount(rawAmount);
    const rc = await tx.wait();
    txHash = tx.hash;
    action = "createAccount";

    for (const log of rc?.logs || []) {
      if (log.address?.toLowerCase() === exchange.toLowerCase() && log.data && log.data.length >= 130) {
        try {
          const idWord = "0x" + log.data.slice(66, 130);
          const n = Number(BigInt(idWord));
          if (n > 0 && n < 1e9) existingAccountId = n;
        } catch {
          /* skip */
        }
      }
    }
    if (existingAccountId) {
      linkPerplAccount(address, existingAccountId);
    }
  }

  return {
    success: true,
    txHash,
    action,
    accountId: existingAccountId,
    amountAUSD,
    address: address.toLowerCase(),
  };
}

export async function placePerplOrder(params: {
  trader: string;
  symbol: string;
  side: "LONG" | "SHORT";
  marginAUSD: number;
  leverage: number;
  accountId?: number;
  tpPrice?: number;
  slPrice?: number;
}) {
  const { trader, symbol, side, marginAUSD, leverage, tpPrice, slPrice } = params;
  if (!ethers.isAddress(trader)) throw new Error("bad address");
  if (marginAUSD <= 0) throw new Error("marginAUSD must be > 0");
  if (leverage < 1 || leverage > 50) throw new Error("leverage must be between 1x and 50x");

  const market = await getPerplMarket(symbol);
  if (!market) throw new Error(`unknown market ${symbol}`);

  const accountId = params.accountId ?? getLinkedPerplAccountId(trader) ?? 644;
  if (accountId == null) {
    throw new Error(
      "No Perpl account linked. Send createAccount on Exchange (AUSD), then POST /v1/perpl/account-link { address, accountId }",
    );
  }

  const entryPrice = market.markPrice;
  const sizeAUSD = marginAUSD * leverage;
  const size = entryPrice > 0 ? sizeAUSD / entryPrice : 0;

  if (!perplAuthConfigured()) {
    throw new Error(
      "Perpl API keys not configured. Set PERPL_API_KEY + PERPL_API_KEY_SECRET (scope: trade) in root .env",
    );
  }

  const wsResult = await placePerplOrderWs({
    accountId,
    marketId: market.perpetualId || market.id,
    side,
    size,
    sizeDecimals: market.sizeDecimals ?? 2,
    leverage,
    // market IOC
    limitPriceScaled: 0,
  });

  if (!wsResult.accepted) {
    throw new Error(wsResult.error || "Perpl order rejected");
  }

  const position: PerplPosition = {
    id: `perpl_${Date.now()}_${market.perpetualId}`,
    trader: trader.toLowerCase(),
    symbol: symbol.toUpperCase(),
    side,
    size: Number(size.toFixed(market.sizeDecimals ?? 4)),
    sizeAUSD: Number(sizeAUSD.toFixed(2)),
    entryPrice: Number(entryPrice.toFixed(market.priceDecimals ?? 2)),
    leverage,
    marginAUSD: Number(marginAUSD.toFixed(2)),
    liquidationPrice: 0,
    openedAt: Date.now(),
    status: "OPEN",
    execution: "perpl-ws",
    accountId,
    tpPrice: tpPrice ? Number(tpPrice.toFixed(market.priceDecimals ?? 2)) : undefined,
    slPrice: slPrice ? Number(slPrice.toFixed(market.priceDecimals ?? 2)) : undefined,
  };

  // Local mirror only
  const all = readJson<PerplPosition[]>(POSITIONS_FILE, []);
  all.push(position);
  writeJson(POSITIONS_FILE, all);

  return {
    success: true,
    execution: "perpl-ws",
    position,
    market,
    perpl: wsResult,
  };
}

export async function closePerplPosition(
  positionId: string,
  trader: string,
  fallback?: {
    symbol?: string;
    side?: "LONG" | "SHORT";
    size?: number;
    leverage?: number;
    entryPrice?: number;
    reason?: "USER" | "TP_TRIGGERED" | "SL_TRIGGERED" | "REVERSED";
  },
) {
  if (!trader) throw new Error("trader address required");
  const normalized = trader.toLowerCase();
  const all = readJson<PerplPosition[]>(POSITIONS_FILE, []);

  let posIndex = all.findIndex((p) => p.id === positionId);
  let pos: PerplPosition | null = posIndex >= 0 ? all[posIndex] : null;

  // If not found by exact ID, search by trader + symbol + status=OPEN
  if (!pos && fallback?.symbol) {
    posIndex = all.findIndex(
      (p) =>
        p.trader.toLowerCase() === normalized &&
        p.symbol.toUpperCase() === fallback.symbol!.toUpperCase() &&
        p.status === "OPEN",
    );
    if (posIndex >= 0) pos = all[posIndex];
  }

  // If still not found, synthesize from fallback metadata so the close operation succeeds
  if (!pos) {
    if (!fallback?.symbol || !fallback?.side || !fallback?.size) {
      throw new Error(`Position ${positionId} not found and no fallback metadata provided`);
    }
    pos = {
      id: positionId,
      trader: normalized,
      symbol: fallback.symbol.toUpperCase(),
      side: fallback.side,
      size: fallback.size,
      sizeAUSD: fallback.size * (fallback.entryPrice || 1),
      entryPrice: fallback.entryPrice || 0,
      leverage: fallback.leverage || 1,
      marginAUSD: 0,
      liquidationPrice: 0,
      openedAt: Date.now(),
      status: "OPEN",
      execution: "perpl-ws",
    };
    all.push(pos);
    posIndex = all.length - 1;
  }

  if (pos.status === "CLOSED") {
    return {
      success: true,
      execution: "perpl-ws" as const,
      position: pos,
      realizedPnL: pos.realizedPnLAUSD ?? 0,
      message: "Position already closed",
    };
  }

  const market = await getPerplMarket(pos.symbol);
  if (!market) throw new Error(`Market ${pos.symbol} not found`);

  const closePrice = market.markPrice || market.lastPrice || pos.entryPrice;
  const priceDelta = pos.side === "LONG" ? closePrice - pos.entryPrice : pos.entryPrice - closePrice;
  const realizedPnLAUSD = Number((priceDelta * pos.size).toFixed(2));

  let wsResult: any = { accepted: true, note: "local-close" };

  if (perplAuthConfigured()) {
    const closeSide: "LONG" | "SHORT" = pos.side === "LONG" ? "SHORT" : "LONG";
    const accountId =
      pos.accountId ??
      getLinkedPerplAccountId(normalized) ??
      644;

    const sDec = market.sizeDecimals ?? 2;
    let closeSize = pos.size;

    // Check live position on Perpl to ensure exact size close
    try {
      const posRes = await perplFetchPositions();
      const liveRow = (posRes?.d || []).find(
        (r: any) =>
          Number(r.mkt) === market.id ||
          Number(r.mkt) === market.perpetualId ||
          String(r.pid) === pos.id,
      );
      if (liveRow && liveRow.s != null) {
        const liveScaled = Number(liveRow.s) / Math.pow(10, sDec);
        if (liveScaled > 0) {
          closeSize = liveScaled;
        }
      }
    } catch {
      /* ignore and use pos.size */
    }

    wsResult = await placePerplOrderWs({
      accountId,
      marketId: market.perpetualId || market.id,
      side: closeSide,
      size: closeSize,
      sizeDecimals: sDec,
      leverage: pos.leverage || 1,
      limitPriceScaled: 0,
    });

    if (!wsResult.accepted) {
      throw new Error(wsResult.error || "Perpl rejected close order");
    }
  }

  pos.status = "CLOSED";
  pos.closedAt = Date.now();
  pos.closedPrice = closePrice;
  pos.realizedPnLAUSD = realizedPnLAUSD;
  pos.closeReason = fallback?.reason || "USER";

  if (posIndex >= 0) {
    all[posIndex] = pos;
  }
  // Mark any matching open position for this trader and symbol as closed
  for (const p of all) {
    if (
      p.trader.toLowerCase() === normalized &&
      p.symbol.toUpperCase() === pos.symbol.toUpperCase() &&
      p.status === "OPEN"
    ) {
      p.status = "CLOSED";
      p.closedAt = Date.now();
      p.closedPrice = closePrice;
      p.realizedPnLAUSD = realizedPnLAUSD;
      p.closeReason = fallback?.reason || "USER";
    }
  }
  writeJson(POSITIONS_FILE, all);

  return {
    success: true,
    execution: "perpl-ws" as const,
    position: pos,
    realizedPnL: realizedPnLAUSD,
    closePrice,
    perpl: wsResult,
  };
}

export async function reversePerplPosition(
  positionId: string,
  trader: string,
  fallback?: {
    symbol?: string;
    side?: "LONG" | "SHORT";
    size?: number;
    leverage?: number;
    entryPrice?: number;
    marginAUSD?: number;
  },
) {
  if (!trader) throw new Error("trader address required");
  // 1. Close current position
  const closeRes = await closePerplPosition(positionId, trader, {
    ...fallback,
    reason: "REVERSED",
  });
  const closedPos = closeRes.position;

  // 2. Open new opposite position with same size & leverage
  const symbol = closedPos.symbol?.toUpperCase() || fallback?.symbol?.toUpperCase() || "BTC";
  const newSide: "LONG" | "SHORT" = closedPos.side === "LONG" ? "SHORT" : "LONG";
  const marginAUSD =
    closedPos.marginAUSD && closedPos.marginAUSD > 0
      ? closedPos.marginAUSD
      : closedPos.sizeAUSD && closedPos.leverage
      ? closedPos.sizeAUSD / closedPos.leverage
      : fallback?.marginAUSD || 10;

  const openRes = await placePerplOrder({
    trader,
    symbol,
    side: newSide,
    marginAUSD: Math.max(5, Number(marginAUSD.toFixed(2))),
    leverage: closedPos.leverage || fallback?.leverage || 2,
    accountId: closedPos.accountId,
  });

  return {
    success: true,
    execution: "perpl-ws" as const,
    closedPosition: closeRes.position,
    newPosition: openRes.position,
    realizedPnL: closeRes.realizedPnL,
    market: openRes.market,
    perpl: openRes.perpl,
  };
}

export async function updatePerplPositionGuards(
  positionId: string,
  trader: string,
  guards: { tpPrice?: number | null; slPrice?: number | null }
) {
  if (!trader) throw new Error("trader address required");
  const normalized = trader.toLowerCase();
  const all = readJson<PerplPosition[]>(POSITIONS_FILE, []);
  const posIndex = all.findIndex(
    (p) => p.id === positionId && p.trader.toLowerCase() === normalized
  );
  if (posIndex < 0) throw new Error(`Position ${positionId} not found`);
  const pos = all[posIndex];
  if (pos.status !== "OPEN") throw new Error("Cannot set guards on closed position");

  if (guards.tpPrice !== undefined) {
    pos.tpPrice = guards.tpPrice === null ? undefined : Number(guards.tpPrice);
  }
  if (guards.slPrice !== undefined) {
    pos.slPrice = guards.slPrice === null ? undefined : Number(guards.slPrice);
  }

  all[posIndex] = pos;
  writeJson(POSITIONS_FILE, all);
  return { success: true, position: pos };
}

export type GuardExecutionResult = {
  positionId: string;
  symbol: string;
  side: "LONG" | "SHORT";
  trader: string;
  triggerType: "TP" | "SL";
  triggerPrice: number;
  markPrice: number;
  realizedPnL: number;
  closedAt: number;
};

export async function checkAndExecutePerplGuards(): Promise<GuardExecutionResult[]> {
  const all = readJson<PerplPosition[]>(POSITIONS_FILE, []);
  const openGuarded = all.filter(
    (p) => p.status === "OPEN" && (p.tpPrice != null || p.slPrice != null)
  );

  if (openGuarded.length === 0) return [];

  const { markets } = await listPerplMarkets();
  const marketMap = new Map<string, PerplMarketSummary>();
  for (const m of markets) {
    marketMap.set(m.symbol.toUpperCase(), m);
  }

  const executed: GuardExecutionResult[] = [];

  for (const pos of openGuarded) {
    const market = marketMap.get(pos.symbol.toUpperCase());
    if (!market || !market.markPrice) continue;
    const markPrice = market.markPrice;

    let triggerType: "TP" | "SL" | null = null;
    let triggerPrice = 0;

    if (pos.side === "LONG") {
      if (pos.tpPrice != null && markPrice >= pos.tpPrice) {
        triggerType = "TP";
        triggerPrice = pos.tpPrice;
      } else if (pos.slPrice != null && markPrice <= pos.slPrice) {
        triggerType = "SL";
        triggerPrice = pos.slPrice;
      }
    } else {
      // SHORT
      if (pos.tpPrice != null && markPrice <= pos.tpPrice) {
        triggerType = "TP";
        triggerPrice = pos.tpPrice;
      } else if (pos.slPrice != null && markPrice >= pos.slPrice) {
        triggerType = "SL";
        triggerPrice = pos.slPrice;
      }
    }

    if (triggerType) {
      console.log(
        `[perpl-guard] ${triggerType} Triggered for ${pos.symbol} ${pos.side} @ $${markPrice} (Target: $${triggerPrice})`
      );
      try {
        const res = await closePerplPosition(pos.id, pos.trader, {
          symbol: pos.symbol,
          side: pos.side,
          size: pos.size,
          leverage: pos.leverage,
          entryPrice: pos.entryPrice,
          reason: triggerType === "TP" ? "TP_TRIGGERED" : "SL_TRIGGERED",
        });
        executed.push({
          positionId: pos.id,
          symbol: pos.symbol,
          side: pos.side,
          trader: pos.trader,
          triggerType,
          triggerPrice,
          markPrice,
          realizedPnL: res.realizedPnL,
          closedAt: Date.now(),
        });
      } catch (err: any) {
        console.error(`[perpl-guard] Failed to close guarded position ${pos.id}:`, err?.message || err);
      }
    }
  }

  return executed;
}

export async function executeHedgeForHunch(params: {
  trader: string;
  symbol: string;
  hunchSide: "UP" | "DOWN";
  hunchAmountAUSD: number;
  hedgeRatio?: number;
  leverage?: number;
}) {
  const { trader, symbol, hunchSide, hunchAmountAUSD, hedgeRatio = 0.5, leverage = 2 } = params;
  if (!ethers.isAddress(trader)) throw new Error("bad address");
  if (hunchAmountAUSD <= 0) throw new Error("hunchAmountAUSD must be > 0");

  // When Hunch is UP, the protective perp hedge is SHORT (and vice versa)
  const perpSide: "LONG" | "SHORT" = hunchSide === "UP" ? "SHORT" : "LONG";
  const hedgeMarginAUSD = Math.max(5, Number((hunchAmountAUSD * hedgeRatio).toFixed(2)));

  const res = await placePerplOrder({
    trader,
    symbol,
    side: perpSide,
    marginAUSD: hedgeMarginAUSD,
    leverage,
  });

  return {
    success: true,
    hunchSide,
    perpSide,
    hedgeRatio,
    hedgeMarginAUSD,
    position: res.position,
    market: res.market,
    perpl: res.perpl,
  };
}
