/**
 * Perpl portfolio risk + analytics (bounty: Best Analytics / Risk Tool).
 * Real account math only — no invented fills.
 */
import { getUserPerplAccount, type PerplPosition } from "./perpl";
import { getPerplMarkets } from "../shared/perpl";
import { perplAuthConfigured } from "../shared/perplAuth";
import { ethers } from "ethers";

export type PerplRiskPosition = PerplPosition & {
  markPrice?: number;
  notionalAUSD: number;
  unrealizedPnLAUSD: number;
  unrealizedPnLPct: number;
  liqDistancePct: number | null;
  side: "LONG" | "SHORT";
};

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
  positions: PerplRiskPosition[];
  marketMarks: { symbol: string; markPrice: number; change24hPct: number }[];
};

function riskLevel(freePct: number, openCount: number): PerplRiskReport["riskLevel"] {
  if (openCount === 0) return "FLAT";
  if (freePct >= 60) return "LOW";
  if (freePct >= 30) return "MEDIUM";
  return "HIGH";
}

export async function buildPerplRisk(address: string): Promise<PerplRiskReport> {
  if (!ethers.isAddress(address)) throw new Error("bad address");
  const [account, markets] = await Promise.all([
    getUserPerplAccount(address),
    getPerplMarkets().catch(() => []),
  ]);
  const marketMap = new Map(markets.map((m) => [m.symbol.toUpperCase(), m]));

  const positions: PerplRiskPosition[] = (account.positions || [])
    .filter((p) => p.status === "OPEN")
    .map((p) => {
    const mkt = marketMap.get(p.symbol.toUpperCase());
    const mark = p.markPrice ?? mkt?.markPrice ?? p.entryPrice;
    const delta = mark - p.entryPrice;
    const rawPnl = p.side === "LONG" ? delta * (p.size || 0) : -delta * (p.size || 0);
    const liqDist =
      p.liquidationPrice > 0 && mark > 0
        ? Math.abs((mark - p.liquidationPrice) / mark) * 100
        : null;
    return {
      ...p,
      markPrice: mark,
      notionalAUSD: p.sizeAUSD || (p.marginAUSD || 0) * (p.leverage || 1),
      unrealizedPnLAUSD: Number(rawPnl.toFixed(2)),
      unrealizedPnLPct:
        p.marginAUSD > 0 ? Number(((rawPnl / p.marginAUSD) * 100).toFixed(2)) : 0,
      liqDistancePct: liqDist != null ? Number(liqDist.toFixed(2)) : null,
    };
  });

  const collateral = Number(account.onchainCollateralAUSD || 0) || Number(account.marginUsedAUSD || 0) + 0;
  const marginUsed = Number(account.marginUsedAUSD || 0);
  const free = Math.max(0, collateral - marginUsed);
  const uPnL = positions.reduce((s, p) => s + p.unrealizedPnLAUSD, 0);
  const notional = positions.reduce((s, p) => s + p.notionalAUSD, 0);
  const maxLev = positions.reduce((m, p) => Math.max(m, p.leverage || 0), 0);
  const freePct = collateral > 0 ? (free / collateral) * 100 : 100;

  const warnings: string[] = [];
  if (maxLev >= 15) warnings.push(`High leverage on book (${maxLev}x)`);
  if (positions.some((p) => (p.liqDistancePct ?? 100) < 8)) {
    warnings.push("Position within 8% of liquidation");
  }
  if (freePct < 15 && positions.length) warnings.push("Low free margin");
  if (uPnL < -collateral * 0.1) warnings.push("Unrealized loss > 10% of collateral");
  if (!perplAuthConfigured()) warnings.push("Perpl trade keys missing — read-only analytics");

  return {
    address: address.toLowerCase(),
    authConfigured: perplAuthConfigured(),
    accountId: account.accountId ?? null,
    collateralAUSD: Number(collateral.toFixed(2)),
    marginUsedAUSD: Number(marginUsed.toFixed(2)),
    freeMarginAUSD: Number(free.toFixed(2)),
    unrealizedPnLAUSD: Number(uPnL.toFixed(2)),
    openNotionalAUSD: Number(notional.toFixed(2)),
    effectiveLeverage: marginUsed > 0 ? Number((notional / marginUsed).toFixed(2)) : 0,
    maxPositionLeverage: maxLev,
    openCount: positions.filter((p) => p.status === "OPEN").length,
    longCount: positions.filter((p) => p.side === "LONG").length,
    shortCount: positions.filter((p) => p.side === "SHORT").length,
    riskLevel: riskLevel(freePct, positions.length),
    warnings,
    positions,
    marketMarks: markets.map((m) => ({
      symbol: m.symbol,
      markPrice: m.markPrice,
      change24hPct: m.change24hPct,
    })),
  };
}

export type StressScenario = {
  shockPct: number;
  projectedPnLAUSD: number;
  projectedCollateralAUSD: number;
  projectedFreeMarginAUSD: number;
  projectedUtilizationPct: number;
  survives: boolean;
  liquidatedPositionsCount: number;
};

export type StressTestReport = {
  address: string;
  currentCollateralAUSD: number;
  currentMarginUsedAUSD: number;
  maxSurvivableDropPct: number;
  maxSurvivablePumpPct: number;
  scenarios: StressScenario[];
};

export async function stressTestPerplPortfolio(address: string): Promise<StressTestReport> {
  const risk = await buildPerplRisk(address);
  const openPositions = risk.positions.filter((p) => p.status === "OPEN");
  const baseCollateral = risk.collateralAUSD;
  const baseMarginUsed = risk.marginUsedAUSD;

  const shockPercentages = [-25, -20, -15, -10, -5, 5, 10, 15, 20, 25];
  const scenarios: StressScenario[] = shockPercentages.map((shockPct) => {
    let shockPnL = 0;
    let liquidatedCount = 0;

    for (const p of openPositions) {
      const mark = p.markPrice ?? p.entryPrice;
      const shockedPrice = mark * (1 + shockPct / 100);
      const delta = shockedPrice - p.entryPrice;
      const pnl = p.side === "LONG" ? delta * (p.size || 0) : -delta * (p.size || 0);
      shockPnL += pnl;

      if (p.liquidationPrice > 0) {
        if (p.side === "LONG" && shockedPrice <= p.liquidationPrice) liquidatedCount++;
        if (p.side === "SHORT" && shockedPrice >= p.liquidationPrice) liquidatedCount++;
      }
    }

    const projCollateral = Math.max(0, baseCollateral + shockPnL);
    const projFree = Math.max(0, projCollateral - baseMarginUsed);
    const projUtil = projCollateral > 0 ? Math.min(100, (baseMarginUsed / projCollateral) * 100) : 100;
    const survives = liquidatedCount === 0 && projCollateral >= baseMarginUsed * 0.2;

    return {
      shockPct,
      projectedPnLAUSD: Number(shockPnL.toFixed(2)),
      projectedCollateralAUSD: Number(projCollateral.toFixed(2)),
      projectedFreeMarginAUSD: Number(projFree.toFixed(2)),
      projectedUtilizationPct: Number(projUtil.toFixed(1)),
      survives,
      liquidatedPositionsCount: liquidatedCount,
    };
  });

  let maxDrop = -100;
  let maxPump = 100;

  for (const p of openPositions) {
    if (p.liquidationPrice > 0 && (p.markPrice ?? 0) > 0) {
      const mark = p.markPrice!;
      const movePct = ((p.liquidationPrice - mark) / mark) * 100;
      if (p.side === "LONG" && movePct < 0) {
        maxDrop = Math.max(maxDrop, movePct);
      } else if (p.side === "SHORT" && movePct > 0) {
        maxPump = Math.min(maxPump, movePct);
      }
    }
  }

  return {
    address: address.toLowerCase(),
    currentCollateralAUSD: baseCollateral,
    currentMarginUsedAUSD: baseMarginUsed,
    maxSurvivableDropPct: maxDrop === -100 ? -50 : Number(maxDrop.toFixed(1)),
    maxSurvivablePumpPct: maxPump === 100 ? 50 : Number(maxPump.toFixed(1)),
    scenarios,
  };
}
