import { ethers } from "ethers";
import { enabledMarkets, symbolForFeed, marketByFeedId } from "../shared/markets";
import { CHAINS, chainByKey } from "../shared/multichain";
import {
  contractAt,
  factoryAbi,
  loadChainDeployment,
  marketAbi,
  providerForChain,
  settlementChains,
} from "../shared/providers";
import { withRpcRetry } from "../shared/rpcRetry";

import { fetchLatestPrice } from "./price";

const cache = new Map<string, { at: number; body: unknown }>();
const TTL = 4000;

function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at > TTL) return null;
  return hit.body as T;
}

function cacheSet(key: string, body: unknown) {
  cache.set(key, { at: Date.now(), body });
}

async function roundSummary(chainKey: string, feedId: string) {
  const chain = chainByKey(chainKey);
  const dep = loadChainDeployment(chain);
  const meta = marketByFeedId(feedId);
  const sym = symbolForFeed(feedId);

  let fallbackPrice: number | null = null;
  try {
    const p = await fetchLatestPrice(sym);
    if (p?.price) fallbackPrice = p.price;
  } catch {}

  if (!dep?.factory) {
    return {
      symbol: sym,
      pair: `${sym}-USD`,
      label: `${sym} / USD`,
      feedId,
      chain: chain.key,
      chainId: chain.chainId,
      category: meta?.category,
      volatilityTier: meta?.volatilityTier,
      volatilityScore: meta?.volatilityScore,
      roundId: null,
      market: null,
      status: "unavailable" as const,
      reason: "no factory deployment on this chain",
      spotPrice: fallbackPrice,
      strike: fallbackPrice ? String(Math.round(fallbackPrice * 1e8)) : null,
      spot: {
        yes: "0.50",
        no: "0.50",
      },
    };
  }

  return withRpcRetry(async () => {
    const provider = providerForChain(chain);
    const factory = contractAt(dep.factory!, factoryAbi(), provider);
    const roundIdBn = (await factory.latestRoundByFeed(feedId)) as bigint;
    if (!roundIdBn || roundIdBn === 0n) {
      return {
        symbol: sym,
        pair: `${sym}-USD`,
        label: `${sym} / USD`,
        feedId,
        chain: chain.key,
        chainId: chain.chainId,
        category: meta?.category,
        volatilityTier: meta?.volatilityTier,
        volatilityScore: meta?.volatilityScore,
        roundId: null,
        market: null,
        status: "waiting" as const,
        reason: "Next round preparing",
        spotPrice: fallbackPrice,
        strike: fallbackPrice ? String(Math.round(fallbackPrice * 1e8)) : null,
        spot: {
          yes: "0.50",
          no: "0.50",
        },
      };
    }
    const marketAddr = (await factory.rounds(roundIdBn)) as string;
    const m = contractAt(marketAddr, marketAbi(), provider);
    const [statusRaw, spots, expiry, strike, feedOn, latest] = await Promise.all([
      m.status(),
      m.spotPrices(),
      m.expiry(),
      m.strikePrice(),
      m.priceFeedId(),
      provider.getBlock("latest"),
    ]);
    const statusNum = Number(statusRaw);
    const [yesWad, noWad] = spots as [bigint, bigint];
    const now = Number(latest!.timestamp);
    const expiryN = Number(expiry);
    return {
      symbol: symbolForFeed(feedId),
      pair: `${symbolForFeed(feedId)}-USD`,
      label: `${symbolForFeed(feedId)} / USD`,
      feedId: String(feedOn),
      chain: chain.key,
      chainName: chain.name,
      chainId: chain.chainId,
      category: meta?.category,
      volatilityTier: meta?.volatilityTier,
      volatilityScore: meta?.volatilityScore,
      settlementHub: Boolean(chain.settlementHub),
      explorer: chain.explorer,
      roundId: roundIdBn.toString(),
      market: marketAddr,
      status: statusNum === 0 ? ("open" as const) : ("resolved" as const),
      strike: strike.toString(),
      expo: -8,
      expiry: expiryN,
      timeRemaining: statusNum === 0 ? Math.max(0, expiryN - now) : 0,
      spot: {
        yes: ethers.formatUnits(yesWad, 18),
        no: ethers.formatUnits(noWad, 18),
      },
    };
  }, { label: `market:${chain.key}:${symbolForFeed(feedId)}` });
}

export async function listMarketsBoard(chainFilter?: string) {
  const key = `board:${chainFilter || "all"}`;
  const hit = cacheGet<any>(key);
  if (hit) return hit;

  const markets = enabledMarkets();
  const chains = chainFilter
    ? [chainByKey(chainFilter)]
    : settlementChains().map((s) => s.chain).length
      ? settlementChains().map((s) => s.chain)
      : CHAINS;

  const board: unknown[] = [];
  for (const chain of chains) {
    for (const meta of markets) {
      board.push(await roundSummary(chain.key, meta.feedId));
    }
  }

  const body = {
    product: "Hunch — mobile multichain trading",
    feature: "short-horizon UP/DOWN markets (CPMM event markets)",
    settlement: "multichain settlement surface · same Privy wallet",
    chains: chains.map((c) => ({
      key: c.key,
      name: c.name,
      chainId: c.chainId,
      settlementHub: c.settlementHub ?? false,
      deployed: Boolean(loadChainDeployment(c)?.factory),
      explorer: c.explorer,
    })),
    markets: board,
  };
  cacheSet(key, body);
  return body;
}

export async function crossChainPortfolio(address: string, lookback = 6) {
  const key = `book:${address.toLowerCase()}`;
  const hit = cacheGet<any>(key);
  if (hit) return hit;

  const { walletSnapshot } = await import("./wallet");
  const chains = settlementChains();
  const perChain = await Promise.all(
    chains.map(async ({ chain, dep }) => {
      if (!dep.factory || !ethers.isAddress(address)) {
        return { chain: chain.key, chainId: chain.chainId, available: false, positions: [], ausd: "0", mon: "0" };
      }
      try {
        // walletSnapshot is Monad-cached — for other chains build inline later; MVP: Monad snapshot + labels
        if (chain.chainId === 10143) {
          const snap = await walletSnapshot(address, lookback);
          return {
            chain: chain.key,
            chainName: chain.name,
            chainId: chain.chainId,
            settlementHub: true,
            available: true,
            address: snap.address,
            ausd: snap.ausd,
            mon: snap.mon,
            positions: snap.positions,
            explorer: snap.explorer,
          };
        }
        return {
          chain: chain.key,
          chainName: chain.name,
          chainId: chain.chainId,
          available: true,
          address,
          ausd: "0",
          mon: "0",
          positions: [],
          note: "positions after Base deploy + keeper",
        };
      } catch (e: any) {
        return {
          chain: chain.key,
          chainId: chain.chainId,
          available: true,
          error: e?.message || String(e),
          positions: [],
        };
      }
    }),
  );

  const body = {
    address,
    model: "same-wallet multichain (EOA on each L1) — BOOK aggregates settlement chains",
    chains: perChain,
  };
  cacheSet(key, body);
  return body;
}
