import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import {
  getPerplMarkets,
  fetchPerplContext,
  PERPL_TESTNET,
  PerplMarketSummary,
} from "../shared/perpl";
import { ausdContract, loadDeployment } from "../shared/chain";

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
};

const POSITIONS_FILE = path.join(__dirname, "..", "..", "data", "perpl_positions.json");

function readPositions(): PerplPosition[] {
  if (!fs.existsSync(POSITIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(POSITIONS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function savePositions(positions: PerplPosition[]) {
  fs.mkdirSync(path.dirname(POSITIONS_FILE), { recursive: true });
  fs.writeFileSync(POSITIONS_FILE, JSON.stringify(positions, null, 2));
}

export async function listPerplMarkets(): Promise<{ markets: PerplMarketSummary[]; context: any }> {
  const [markets, rawCtx] = await Promise.all([getPerplMarkets(), fetchPerplContext()]);
  return {
    markets,
    context: {
      chainId: rawCtx.chain?.chain_id ?? PERPL_TESTNET.chainId,
      collateralToken: rawCtx.tokens?.[0]?.address ?? PERPL_TESTNET.collateralToken,
      exchange: rawCtx.instances?.[0]?.address ?? PERPL_TESTNET.exchange,
      minAccountOpenAUSD: (rawCtx.instances?.[0]?.min_account_open_amount ?? 100000000) / 1e6,
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
  const allPositions = readPositions();
  const userPositions = allPositions.filter((p) => p.trader.toLowerCase() === normalized && p.status === "OPEN");

  const markets = await getPerplMarkets();
  const marketMap = new Map(markets.map((m) => [m.symbol.toUpperCase(), m]));

  let totalUnrealizedPnL = 0;
  let totalMarginUsed = 0;

  const enrichedPositions = userPositions.map((p) => {
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

  return {
    address,
    exchange: PERPL_TESTNET.exchange,
    collateralToken: PERPL_TESTNET.collateralToken,
    marginUsedAUSD: Number(totalMarginUsed.toFixed(2)),
    unrealizedPnLAUSD: Number(totalUnrealizedPnL.toFixed(2)),
    openPositionsCount: enrichedPositions.length,
    positions: enrichedPositions,
  };
}

export async function buildPerplDepositCalldata(amountAUSD: number, address: string) {
  if (!ethers.isAddress(address)) throw new Error("bad address");
  if (amountAUSD < 10) throw new Error("minimum deposit is 10 AUSD");

  const dep = loadDeployment();
  const exchange = dep.perpl?.exchange || PERPL_TESTNET.exchange;
  const token = dep.collateral.address || PERPL_TESTNET.collateralToken;

  const rawAmount = ethers.parseUnits(amountAUSD.toString(), 6);

  // Approve token
  const erc20Interface = new ethers.Interface([
    "function approve(address spender, uint256 amount) returns (bool)",
  ]);
  const approveData = erc20Interface.encodeFunctionData("approve", [exchange, rawAmount]);

  // Perpl deposit / createAccount
  const exchangeInterface = new ethers.Interface([
    "function createAccount(uint256 collateralAmount) returns (uint64)",
    "function deposit(uint64 accountId, uint256 amount)",
  ]);
  const depositData = exchangeInterface.encodeFunctionData("createAccount", [rawAmount]);

  return {
    chainId: PERPL_TESTNET.chainId,
    exchange,
    token,
    amountAUSD,
    approve: {
      to: token,
      data: approveData,
      value: "0",
    },
    deposit: {
      to: exchange,
      data: depositData,
      value: "0",
    },
  };
}

export async function placePerplOrder(params: {
  trader: string;
  symbol: string;
  side: "LONG" | "SHORT";
  marginAUSD: number;
  leverage: number;
}) {
  const { trader, symbol, side, marginAUSD, leverage } = params;
  if (!ethers.isAddress(trader)) throw new Error("bad address");
  if (marginAUSD <= 0) throw new Error("marginAUSD must be > 0");
  if (leverage < 1 || leverage > 50) throw new Error("leverage must be between 1x and 50x");

  const market = await getPerplMarket(symbol);
  if (!market) throw new Error(`unknown market ${symbol}`);

  const entryPrice = market.markPrice;
  const sizeAUSD = marginAUSD * leverage;
  const size = entryPrice > 0 ? sizeAUSD / entryPrice : 0;

  // Liquidation price estimate: 80% maintenance margin loss
  const maxLossFraction = 1 - 1 / (leverage * 1.1);
  const liquidationPrice =
    side === "LONG"
      ? entryPrice * (1 - 1 / leverage + 0.05)
      : entryPrice * (1 + 1 / leverage - 0.05);

  const position: PerplPosition = {
    id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    trader: trader.toLowerCase(),
    symbol: symbol.toUpperCase(),
    side,
    size: Number(size.toFixed(market.sizeDecimals || 4)),
    sizeAUSD: Number(sizeAUSD.toFixed(2)),
    entryPrice: Number(entryPrice.toFixed(market.priceDecimals || 2)),
    leverage,
    marginAUSD: Number(marginAUSD.toFixed(2)),
    liquidationPrice: Math.max(0, Number(liquidationPrice.toFixed(market.priceDecimals || 2))),
    openedAt: Date.now(),
    status: "OPEN",
  };

  const positions = readPositions();
  positions.push(position);
  savePositions(positions);

  return {
    success: true,
    position,
    market,
  };
}

export async function closePerplPosition(positionId: string, trader: string) {
  const positions = readPositions();
  const idx = positions.findIndex(
    (p) => p.id === positionId && p.trader.toLowerCase() === trader.toLowerCase() && p.status === "OPEN"
  );
  if (idx < 0) throw new Error("position not found or already closed");

  const p = positions[idx];
  const market = await getPerplMarket(p.symbol);
  const closePrice = market ? market.markPrice : p.entryPrice;
  const priceDelta = closePrice - p.entryPrice;
  const pnlAUSD = p.side === "LONG" ? priceDelta * p.size : -priceDelta * p.size;

  p.status = "CLOSED";
  p.closedAt = Date.now();
  p.closedPrice = closePrice;
  p.realizedPnL = Number(pnlAUSD.toFixed(2));

  positions[idx] = p;
  savePositions(positions);

  return {
    success: true,
    position: p,
    realizedPnL: p.realizedPnL,
  };
}
