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
import { ausdContract, getProvider, loadDeployment } from "../shared/chain";
import {
  perplAuthConfigured,
  placePerplOrderWs,
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
  execution?: "perpl-ws";
  accountId?: number;
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
      const hist = await perplFetchPositionHistory(20);
      const rows = (hist?.d || hist?.positions || []) as any[];
      positions = rows.slice(0, 20).map((row, i) => {
        const side = row?.t === 2 || row?.side === 2 ? "SHORT" : "LONG";
        const mktId = Number(row?.mkt ?? row?.market_id ?? 0);
        const symbol =
          markets.find((m) => m.id === mktId || m.perpetualId === mktId)?.symbol || "PERP";
        return {
          id: String(row?.id ?? row?.o ?? `h_${i}`),
          trader: normalized,
          symbol,
          side: side as "LONG" | "SHORT",
          size: Number(row?.s ?? 0),
          sizeAUSD: Number(row?.s ?? 0),
          entryPrice: Number(row?.p ?? 0),
          leverage: Number(row?.lv ?? 0) / 100,
          marginAUSD: 0,
          liquidationPrice: 0,
          openedAt: Number(row?.at ?? Date.now()),
          status: row?.st === 4 || row?.r ? "CLOSED" : "OPEN",
          execution: "perpl-ws" as const,
          accountId: accountId ?? undefined,
        };
      });
    } catch (e: any) {
      historyError = e?.message || String(e);
    }
  } else {
    historyError =
      "Perpl API keys not configured — set PERPL_API_KEY + PERPL_API_KEY_SECRET for live fills/positions";
  }

  let totalUnrealizedPnL = 0;
  let totalMarginUsed = 0;
  const enriched = positions.map((p) => {
    const market = marketMap.get(p.symbol.toUpperCase());
    const currentPrice = market ? market.markPrice : p.entryPrice;
    const priceDelta = currentPrice - p.entryPrice;
    const pnlAUSD = p.side === "LONG" ? priceDelta * p.size : -priceDelta * p.size;
    const pnlPct = p.marginAUSD > 0 ? (pnlAUSD / p.marginAUSD) * 100 : 0;
    totalUnrealizedPnL += pnlAUSD;
    totalMarginUsed += p.marginAUSD;
    return {
      ...p,
      markPrice: currentPrice,
      unrealizedPnLAUSD: Number(pnlAUSD.toFixed(2)),
      unrealizedPnLPct: Number(pnlPct.toFixed(2)),
    };
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
  if (amountAUSD < 10) throw new Error("minimum deposit is 10 AUSD");

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

  const exchangeInterface = new ethers.Interface([
    "function createAccount(uint256 collateralAmount) external returns (uint64)",
  ]);
  const depositData = exchangeInterface.encodeFunctionData("createAccount", [rawAmount]);

  return {
    chainId: PERPL_TESTNET.chainId,
    exchange,
    token,
    amountAUSD,
    minAccountOpenAUSD: PERPL_TESTNET.minAccountOpen,
    approve: { to: token, data: approveData, value: "0" },
    deposit: { to: exchange, data: depositData, value: "0" },
  };
}

export async function placePerplOrder(params: {
  trader: string;
  symbol: string;
  side: "LONG" | "SHORT";
  marginAUSD: number;
  leverage: number;
  accountId?: number;
}) {
  const { trader, symbol, side, marginAUSD, leverage } = params;
  if (!ethers.isAddress(trader)) throw new Error("bad address");
  if (marginAUSD <= 0) throw new Error("marginAUSD must be > 0");
  if (leverage < 1 || leverage > 50) throw new Error("leverage must be between 1x and 50x");

  const market = await getPerplMarket(symbol);
  if (!market) throw new Error(`unknown market ${symbol}`);

  const accountId = params.accountId ?? getLinkedPerplAccountId(trader);
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
    sizeDecimals: market.sizeDecimals || 2,
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
    size: Number(size.toFixed(market.sizeDecimals || 4)),
    sizeAUSD: Number(sizeAUSD.toFixed(2)),
    entryPrice: Number(entryPrice.toFixed(market.priceDecimals || 2)),
    leverage,
    marginAUSD: Number(marginAUSD.toFixed(2)),
    liquidationPrice: 0,
    openedAt: Date.now(),
    status: "OPEN",
    execution: "perpl-ws",
    accountId,
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

export async function closePerplPosition(positionId: string, trader: string) {
  throw new Error(
    `Close position ${positionId} is not implemented on Perpl WS yet. Use Perpl app or trade-scope cancel (OrderType 3/4). Trader=${trader}`,
  );
}
