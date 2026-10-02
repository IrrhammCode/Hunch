import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { ethers } from "ethers";
import {
  ausdContract,
  factoryContract,
  getProvider,
  loadDeployment,
  loadEnv,
  marketContract,
  MONAD_TESTNET,
} from "../shared/chain";
import { currentRound, readStore, syncIndex, type RoundRow } from "../indexer/index";
import { buildCommitCalldata, buildExecuteCalldata, buildRedeemCalldata } from "../userop/encode";
import { quoteBuy } from "./quote";
import { executeCommittedIntent } from "./relayedTrade";
import { clientIp, pruneRateLimits, rateLimit } from "./rateLimit";
import { isRateLimitError, withRpcRetry } from "../shared/rpcRetry";
import { listMarketsBoard, crossChainPortfolio } from "./markets";
import { enabledMarkets } from "../shared/markets";
import { CHAINS } from "../shared/multichain";
import { sponsorsApp } from "./sponsors";
import { perkStatus } from "../shared/sponsors";
import {
  faucetWallet,
  clearWalletCache,
  walletSnapshot,
  FAUCET,
} from "./wallet";
import {
  listPerplMarkets,
  getPerplMarket,
  getUserPerplAccount,
  buildPerplDepositCalldata,
  buildPerplWithdrawCalldata,
  relayPerplDeposit,
  placePerplOrder,
  closePerplPosition,
  reversePerplPosition,
  linkPerplAccount,
  updatePerplPositionGuards,
  checkAndExecutePerplGuards,
  executeHedgeForHunch,
} from "./perpl";
import { buildPerplRisk, stressTestPerplPortfolio } from "./perplRisk";
import { PERPL_TESTNET } from "../shared/perpl";

loadEnv();

process.on("uncaughtException", (err) => {
  console.error("[api] uncaughtException:", err?.message || err);
});
process.on("unhandledRejection", (err: any) => {
  console.error("[api] unhandledRejection:", err?.message || err);
});

const app = new Hono();
app.use("*", cors());

/** In-flight guard — one relay execute at a time. */
let executeBusy = false;

/** Cache so phone poll + keeper don't melt public RPC (15 req/s cap). */
let roundCache: { key: string; at: number; body: any } | null = null;
const ROUND_CACHE_MS = Number(process.env.ROUND_CACHE_MS || 5000);

app.get("/health", (c) => c.json({ ok: true, service: "hunch-api" }));

app.get("/v1/config", (c) => {
  const dep = loadDeployment();
  return c.json({
    chainId: dep.chainId,
    factory: dep.factory,
    collateral: dep.collateral,
    pyth: dep.pyth,
    btcUsdFeedId: dep.btcUsdFeedId,
    markets: enabledMarkets(),
    perpl: {
      exchange: dep.perpl?.exchange || PERPL_TESTNET.exchange,
      apiUrl: dep.perpl?.apiUrl || PERPL_TESTNET.apiUrl,
      wsUrl: dep.perpl?.wsUrl || PERPL_TESTNET.wsUrl,
      chainId: dep.perpl?.chainId || PERPL_TESTNET.chainId,
    },
    chains: CHAINS.map((ch) => ({
      key: ch.key,
      name: ch.name,
      chainId: ch.chainId,
      settlementHub: Boolean(ch.settlementHub),
    })),
    vault: dep.vault ?? null,
    explorer: MONAD_TESTNET.explorer,
    delayBlocks: 2,
    duration: 60,
  });
});

// Transparent forwarder if running in a geoblocked region (e.g. US dyno -> EU dyno)
const PERPL_FORWARD_URL = process.env.PERPL_FORWARD_URL?.replace(/\/+$/, "");
if (PERPL_FORWARD_URL) {
  console.log(`[api] Forwarding all /v1/perpl/* requests to ${PERPL_FORWARD_URL}`);
  app.all("/v1/perpl/*", async (c) => {
    try {
      const url = new URL(c.req.url);
      const targetUrl = `${PERPL_FORWARD_URL}${url.pathname}${url.search}`;
      const headers = new Headers(c.req.raw.headers);
      headers.delete("host");
      const init: RequestInit = {
        method: c.req.method,
        headers,
      };
      if (c.req.method !== "GET" && c.req.method !== "HEAD") {
        init.body = await c.req.raw.arrayBuffer();
      }
      const res = await fetch(targetUrl, init);
      const resHeaders = new Headers(res.headers);
      resHeaders.delete("content-encoding");
      resHeaders.delete("transfer-encoding");
      return new Response(res.body, {
        status: res.status,
        headers: resHeaders,
      });
    } catch (err: any) {
      console.error("[api] Perpl proxy forward error:", err?.message || err);
      return c.json({ error: `Proxy error: ${err?.message || err}` }, 502);
    }
  });
}

/** Perpl Perpetuals Routes (Agora Onchain Trading Bounty) */
app.get("/v1/perpl/markets", async (c) => {
  try {
    return c.json(await listPerplMarkets());
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 500);
  }
});

app.get("/v1/perpl/market/:symbol", async (c) => {
  try {
    const symbol = c.req.param("symbol");
    const market = await getPerplMarket(symbol);
    if (!market) return c.json({ error: `market ${symbol} not found` }, 404);
    return c.json({ market });
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 500);
  }
});

app.get("/v1/perpl/account/:address", async (c) => {
  try {
    const address = c.req.param("address");
    return c.json(await getUserPerplAccount(address));
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

/** Perpl portfolio risk + analytics (Best Analytics / Risk Tool bounty). */
app.get("/v1/perpl/risk/:address", async (c) => {
  try {
    const address = c.req.param("address");
    return c.json(await buildPerplRisk(address));
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

/** Portfolio stress-test & shock simulation (Best Analytics / Risk Tool bounty). */
app.get("/v1/perpl/risk/:address/stress-test", async (c) => {
  try {
    const address = c.req.param("address");
    return c.json(await stressTestPerplPortfolio(address));
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

app.post("/v1/perpl/tx/deposit", async (c) => {
  try {
    const body = await c.req.json();
    const { amountAUSD, address } = body;
    const calldata = await buildPerplDepositCalldata(Number(amountAUSD), address);
    return c.json(calldata);
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

app.post("/v1/perpl/tx/withdraw", async (c) => {
  try {
    const body = await c.req.json();
    const { amountAUSD, address } = body;
    const calldata = await buildPerplWithdrawCalldata(Number(amountAUSD), address);
    return c.json(calldata);
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

app.post("/v1/perpl/margin/deposit", async (c) => {
  try {
    const body = await c.req.json();
    const { amountAUSD, address } = body;
    if (!amountAUSD || !address) return c.json({ error: "amountAUSD and address required" }, 400);
    const result = await relayPerplDeposit(Number(amountAUSD), address);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

app.post("/v1/perpl/order", async (c) => {
  try {
    const body = await c.req.json();
    const result = await placePerplOrder(body);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

app.post("/v1/perpl/order/close", async (c) => {
  try {
    const body = await c.req.json();
    const { positionId, trader, ...fallback } = body;
    if (!positionId || !trader) return c.json({ error: "positionId and trader required" }, 400);
    const result = await closePerplPosition(positionId, trader, fallback);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

app.post("/v1/perpl/order/reverse", async (c) => {
  try {
    const body = await c.req.json();
    const { positionId, trader, ...fallback } = body;
    if (!positionId || !trader) return c.json({ error: "positionId and trader required" }, 400);
    const result = await reversePerplPosition(positionId, trader, fallback);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

/** Update TP / SL guards for an open position */
app.post("/v1/perpl/position/guards", async (c) => {
  try {
    const body = await c.req.json();
    const { positionId, trader, tpPrice, slPrice } = body;
    if (!positionId || !trader) return c.json({ error: "positionId and trader required" }, 400);
    const result = await updatePerplPositionGuards(positionId, trader, { tpPrice, slPrice });
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

/** Trigger TP / SL keeper evaluation tick */
app.post("/v1/perpl/guards/check", async (c) => {
  try {
    const executed = await checkAndExecutePerplGuards();
    return c.json({ success: true, count: executed.length, executed });
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 500);
  }
});

app.get("/v1/perpl/guards/check", async (c) => {
  try {
    const executed = await checkAndExecutePerplGuards();
    return c.json({ success: true, count: executed.length, executed });
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 500);
  }
});

/** Hedge-My-Hunch cross-product order execution */
app.post("/v1/perpl/hedge/hunch", async (c) => {
  try {
    const body = await c.req.json();
    const result = await executeHedgeForHunch(body);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

/** Link on-chain Perpl accountId after createAccount tx */
app.post("/v1/perpl/account-link", async (c) => {
  try {
    const body = await c.req.json<{ address?: string; accountId?: number | string }>();
    const address = body.address;
    const accountId = Number(body.accountId);
    if (!address || !ethers.isAddress(address)) return c.json({ error: "address required" }, 400);
    if (!Number.isFinite(accountId) || accountId < 0) {
      return c.json({ error: "accountId required" }, 400);
    }
    return c.json(linkPerplAccount(address, accountId));
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

/** Multichain market board — UP/DOWN short-horizon markets per settlement chain */
app.get("/v1/markets", async (c) => {
  try {
    const chain = c.req.query("chain") || undefined;
    return c.json(await listMarketsBoard(chain));
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  }
});

/** Cross-chain BOOK — same Privy wallet across settlement chains */
app.get("/v1/book/:address", async (c) => {
  try {
    const address = c.req.param("address");
    if (!ethers.isAddress(address)) return c.json({ error: "bad address" }, 400);
    return c.json(await crossChainPortfolio(address));
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  }
});

/** Round current for a market symbol (BTC/ETH/SOL) — defaults BTC/latest factory round */
app.get("/v1/markets/:symbol/current", async (c) => {
  try {
    const symbol = c.req.param("symbol").toUpperCase();
    const board = (await listMarketsBoard()) as { markets: any[] };
    const hit = board.markets.find((m) => m.symbol === symbol && m.chain === "monad");
    if (!hit) return c.json({ round: null, error: "unknown market" }, 404);
    return c.json({
      round: hit.roundId
        ? {
            roundId: hit.roundId,
            market: hit.market,
            status: hit.status,
            strike: hit.strike,
            expo: hit.expo,
            expiry: hit.expiry,
            feedId: hit.feedId,
          }
        : null,
      spot: hit.spot,
      timeRemaining: hit.timeRemaining,
      market: hit,
    });
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  }
});

app.get("/v1/round/current", async (c) => {
  const symbol = c.req.query("symbol")?.toUpperCase();
  const cacheKey = symbol || "latest";
  if (roundCache && roundCache.key === cacheKey && Date.now() - roundCache.at < ROUND_CACHE_MS) {
    const elapsedSec = (Date.now() - roundCache.at) / 1000;
    const dynamicBody = {
      ...roundCache.body,
      timeRemaining: Math.max(0, Math.round(((roundCache.body.timeRemaining ?? 0) - elapsedSec) * 10) / 10),
    };
    return c.json(dynamicBody);
  }

  try {
    const body = await withRpcRetry(async () => {
      const provider = getProvider();
      const factory = factoryContract(provider);
      let marketAddr: string | null = null;
      let roundId = "";

      if (symbol) {
        const { feedIdFor } = await import("../shared/markets");
        const feedId = feedIdFor(symbol);
        const idBn = (await factory.latestRoundByFeed(feedId)) as bigint;
        if (idBn && idBn > 0n) {
          roundId = idBn.toString();
          marketAddr = (await factory.rounds(idBn)) as string;
        }
      } else {
        const roundCount = Number(await factory.roundCount());
        if (roundCount > 0) {
          roundId = String(roundCount);
          marketAddr = (await factory.rounds(roundCount)) as string;
        }
      }
      if (!marketAddr) return { round: null };

      const m = marketContract(marketAddr, provider);

      const [statusRaw, spots, strike, expiry, startTime, feedId, latest] = await Promise.all([
        m.status(),
        m.spotPrices(),
        m.strikePrice(),
        m.expiry(),
        m.startTime(),
        m.priceFeedId(),
        provider.getBlock("latest"),
      ]);

      const statusNum = Number(statusRaw);
      const [yesWad, noWad] = spots as [bigint, bigint];
      const now = Number(latest!.timestamp);
      const expiryN = Number(expiry);

      let yesWins: boolean | undefined;
      let settlement: string | undefined;
      if (statusNum === 1) {
        const [yw, sp] = await Promise.all([m.yesWins(), m.settlementPrice()]);
        yesWins = Boolean(yw);
        settlement = sp.toString();
      }

      return {
        round: {
          roundId,
          market: marketAddr,
          feedId: feedId as string,
          symbol,
          seed: "0",
          strike: strike.toString(),
          expo: -8,
          startTime: Number(startTime),
          expiry: expiryN,
          status: statusNum === 0 ? ("open" as const) : ("resolved" as const),
          yesWins,
          settlement,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        spot: {
          yes: ethers.formatUnits(yesWad, 18),
          no: ethers.formatUnits(noWad, 18),
        },
        timeRemaining: statusNum === 0 ? Math.max(0, expiryN - now) : 0,
      };
    }, { label: `round/current:${cacheKey}` });

    roundCache = { key: cacheKey, at: Date.now(), body };
    return c.json(body);
  } catch (e: any) {
    if (roundCache && roundCache.body) {
      const elapsedSec = (Date.now() - roundCache.at) / 1000;
      return c.json({
        ...roundCache.body,
        timeRemaining: Math.max(0, Math.round(((roundCache.body.timeRemaining ?? 0) - elapsedSec) * 10) / 10),
      });
    }
    const msg = e.shortMessage || e.message || String(e);
    const rateLimited = isRateLimitError(e);
    return c.json(
      { round: null, error: rateLimited ? "RPC rate limited — retry shortly" : msg },
      rateLimited ? 503 : 500,
    );
  }
});

app.get("/v1/round/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    if (!Number.isFinite(id) || id < 1) return c.json({ error: "bad id" }, 400);
    const provider = getProvider();
    const factory = factoryContract(provider);
    const count = Number(await factory.roundCount());
    if (id > count) return c.json({ round: null }, 404);
    const market = (await factory.rounds(id)) as string;
    const m = marketContract(market, provider);
    const statusNum = Number(await m.status());
    return c.json({
      round: {
        roundId: String(id),
        market,
        status: statusNum === 0 ? "open" : "resolved",
        yesWins: statusNum === 1 ? Boolean(await m.yesWins()) : undefined,
        strike: (await m.strikePrice()).toString(),
        expo: -8,
        expiry: Number(await m.expiry()),
      },
    });
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  }
});

  app.get("/v1/rounds", async (c) => {
  await syncIndex();
  const store = readStore();
  const rounds = Object.values(store.rounds).sort((a, b) => Number(b.roundId) - Number(a.roundId));
  return c.json({ rounds });
});

app.get("/v1/trades", async (c) => {
  await syncIndex();
  const trader = c.req.query("trader")?.toLowerCase();
  let trades = readStore().trades;
  if (trader) trades = trades.filter((t) => t.trader.toLowerCase() === trader);
  return c.json({ trades: trades.slice(-100).reverse() });
});

app.get("/v1/position/:address", async (c) => {
  const address = c.req.param("address");
  await syncIndex();
  const row = currentRound(readStore());
  if (!row) return c.json({ position: null });
  const m = marketContract(row.market, getProvider());
  const yes = await m.yesBalances(address);
  const no = await m.noBalances(address);
  return c.json({
    roundId: row.roundId,
    market: row.market,
    yes: ethers.formatUnits(yes, 6),
    no: ethers.formatUnits(no, 6),
    status: row.status,
  });
});

/** Any wallet snapshot (Privy embedded address) */
app.get("/v1/wallet/:address", async (c) => {
  try {
    const address = c.req.param("address");
    if (!ethers.isAddress(address)) return c.json({ error: "bad address" }, 400);
    return c.json(await walletSnapshot(address));
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  }
});

/** Testnet faucet: Agora AUSD + MON for the signed wallet (capped + rate-limited) */
app.post("/v1/wallet/faucet", async (c) => {
  try {
    const body = await c.req.json<{ address?: string; amountAUSD?: string }>();
    const address = body.address;
    if (!address || !ethers.isAddress(address)) return c.json({ error: "address required" }, 400);

    // Idempotent no-op without burning the cooldown
    const peek = await walletSnapshot(address);
    const alreadyAUSD = Number(peek.ausd) >= FAUCET.fundedAUSDThreshold;
    const alreadyMON = Number(peek.mon) >= Number(FAUCET.monSkipAbove);
    if (alreadyAUSD && alreadyMON) {
      return c.json({
        address,
        ausd: peek.ausd,
        mon: peek.mon,
        alreadyFunded: true,
        message: "already funded — try again later",
      });
    }

    pruneRateLimits(FAUCET.cooldownMs);
    const addrLimit = rateLimit(`faucet:addr:${address}`, 1, FAUCET.cooldownMs);
    if (!addrLimit.ok) {
      return c.json(
        { error: "faucet cooldown — try again later", retryAfterSec: addrLimit.retryAfterSec },
        429,
      );
    }
    const ipLimit = rateLimit(`faucet:ip:${clientIp((n) => c.req.header(n))}`, 8, FAUCET.cooldownMs);
    if (!ipLimit.ok) {
      return c.json(
        { error: "faucet cooldown — try again later", retryAfterSec: ipLimit.retryAfterSec },
        429,
      );
    }

    return c.json(await faucetWallet(address, body.amountAUSD || "1000"));
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  }
});

/**
 * Relay executeBuy for a Privy-committed intent.
 * Mobile signs approve+commitBuy; hot wallet waits delay-blocks + Pyth then executes.
 * Shares always credit the original trader.
 * Rate-limited per trader + IP; validates market when supplied.
 */
app.post("/v1/trade/execute", async (c) => {
  if (executeBusy) return c.json({ error: "trade in progress — retry in a few seconds" }, 429);
  let locked = false;
  try {
    const body = await c.req.json<{ trader: string; intentId?: string; market?: string }>();
    if (!body.trader || !ethers.isAddress(body.trader)) {
      return c.json({ error: "trader address required" }, 400);
    }
    if (body.intentId !== undefined && body.intentId !== null) {
      const idNum = Number(body.intentId);
      if (!Number.isFinite(idNum) || idNum < 1 || idNum > 1e9) {
        return c.json({ error: "bad intentId" }, 400);
      }
    }
    if (body.market && !ethers.isAddress(body.market)) {
      return c.json({ error: "bad market address" }, 400);
    }

    // Validate market is a known factory round when provided
    if (body.market) {
      const provider = getProvider();
      const factory = factoryContract(provider);
      const count = Number(await factory.roundCount());
      const known = new Set<string>();
      for (let i = Math.max(1, count - 12); i <= count; i++) {
        try {
          known.add(String(await factory.rounds(i)).toLowerCase());
        } catch {
          /* skip */
        }
      }
      if (!known.has(body.market.toLowerCase())) {
        return c.json({ error: "unknown market — not a recent factory round" }, 400);
      }
    }

    pruneRateLimits(60_000);
    const addrLimit = rateLimit(`exec:addr:${body.trader}`, 4, 60_000);
    if (!addrLimit.ok) {
      return c.json(
        { error: "execute rate limited — retry shortly", retryAfterSec: addrLimit.retryAfterSec },
        429,
      );
    }
    const ipLimit = rateLimit(`exec:ip:${clientIp((n) => c.req.header(n))}`, 12, 60_000);
    if (!ipLimit.ok) {
      return c.json(
        { error: "execute rate limited — retry shortly", retryAfterSec: ipLimit.retryAfterSec },
        429,
      );
    }

    executeBusy = true;
    locked = true;
    const result = await executeCommittedIntent({
      trader: body.trader,
      intentId: body.intentId,
      market: body.market,
    });
    clearWalletCache();
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  } finally {
    if (locked) executeBusy = false;
  }
});

app.post("/v1/quote", async (c) => {
  try {
    const body = await c.req.json<{ side: "YES" | "NO"; amountAUSD: string; market?: string }>();
    let market = body.market;
    if (!market) {
      const factory = factoryContract(getProvider());
      const n = Number(await factory.roundCount());
      if (n === 0) return c.json({ error: "no active market" }, 404);
      market = (await factory.rounds(n)) as string;
    }
    const q = await quoteBuy(market, body.side, body.amountAUSD);
    return c.json(q);
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  }
});

/** Calldata for Privy/ZeroDev UserOps — gasless path on iOS */
app.post("/v1/tx/commit", async (c) => {
  const body = await c.req.json<{
    side: "YES" | "NO";
    amountAUSD: string;
    minShares?: string;
    symbol?: string;
    market?: string;
  }>();
  const amount = ethers.parseUnits(body.amountAUSD, 6);
  const minShares = ethers.parseUnits(body.minShares || "0", 6);
  const dep = loadDeployment();

  let marketAddr = body.market;
  if (!marketAddr) {
    const { feedIdFor } = await import("../shared/markets");
    const feedId = feedIdFor(body.symbol);
    const factory = factoryContract(getProvider(), dep);
    const idBn = (await factory.latestRoundByFeed(feedId)) as bigint;
    if (idBn && idBn > 0n) marketAddr = (await factory.rounds(idBn)) as string;
  }
  if (!marketAddr) {
    await syncIndex();
    const row = currentRound(readStore()) as RoundRow | null;
    if (!row || row.status !== "open") return c.json({ error: "no open round" }, 400);
    marketAddr = row.market;
  }

  const m = marketContract(marketAddr, getProvider());
  const status = Number(await m.status());
  if (status !== 0) return c.json({ error: "round not open" }, 400);

  return c.json({
    chainId: dep.chainId,
    market: marketAddr,
    symbol: body.symbol || "BTC",
    collateral: dep.collateral.address,
    approve: {
      to: dep.collateral.address,
      data: ausdContract(getProvider()).interface.encodeFunctionData("approve", [marketAddr, amount]),
      value: "0",
    },
    commit: buildCommitCalldata(marketAddr, body.side, amount, minShares),
  });
});

app.post("/v1/tx/execute", async (c) => {
  const body = await c.req.json<{ intentId: string; market?: string }>();
  await syncIndex();
  const row = currentRound(readStore());
  const market = body.market || row?.market;
  if (!market) return c.json({ error: "no market" }, 404);
  return c.json(buildExecuteCalldata(market, BigInt(body.intentId)));
});

app.post("/v1/tx/redeem", async (c) => {
  const body = await c.req.json<{ market?: string }>();
  await syncIndex();
  const row = currentRound(readStore());
  const market = body.market || row?.market;
  if (!market) return c.json({ error: "no market" }, 404);
  return c.json(buildRedeemCalldata(market));
});

app.get("/v1/factory", async (c) => {
  const dep = loadDeployment();
  const f = factoryContract(getProvider(), dep);
  return c.json({
    roundCount: (await f.roundCount()).toString(),
    defaultDuration: Number(await f.defaultDuration()),
    defaultDelayBlocks: Number(await f.defaultDelayBlocks()),
    defaultMaxPriceAge: Number(await f.defaultMaxPriceAge()),
  });
});

// Metropolis perks: Quicknode / Tenderly / Zerion
app.route("/", sponsorsApp);

/** Live prices + chart history (Pyth Hermes) */
import { catalogMarkets, fetchLatestPrice, fetchPriceHistory } from "./price";

app.get("/v1/price/catalog", (c) => c.json({ markets: catalogMarkets() }));

app.get("/v1/price/:symbol", async (c) => {
  try {
    return c.json(await fetchLatestPrice(c.req.param("symbol")));
  } catch (e: any) {
    return c.json({ error: e?.message || String(e) }, 502);
  }
});

app.get("/v1/price/:symbol/history", async (c) => {
  try {
    const q = c.req.query();
    const resolution = Number(q.resolution || 1);
    const bars = Number(q.bars || 90);
    return c.json(await fetchPriceHistory(c.req.param("symbol"), resolution, bars));
  } catch (e: any) {
    return c.json({ error: e?.message || String(e) }, 502);
  }
});

/** Global User Directory Routes */
import { getAllProfiles, registerProfile, resolveProfile } from "./directory";

app.get("/v1/directory", (c) => {
  const q = c.req.query("q");
  return c.json({ directory: getAllProfiles(q) });
});

app.get("/v1/directory/:query", (c) => {
  const query = c.req.param("query");
  const profile = resolveProfile(query);
  if (!profile) return c.json({ error: `Profile '${query}' not found` }, 404);
  return c.json({ profile });
});

app.post("/v1/directory/register", async (c) => {
  try {
    const body = await c.req.json<{
      handle: string;
      address: string;
      name?: string;
      bio?: string;
      avatarColor?: string;
    }>();
    const result = registerProfile(body);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 400);
  }
});

const port = Number(process.env.PORT || process.env.API_PORT || 8787);
const hostname = process.env.API_HOST || "0.0.0.0";
console.log(`[api] http://localhost:${port} (bound ${hostname})`);
console.log("[api] perks", perkStatus());
serve({ fetch: app.fetch, port, hostname });
