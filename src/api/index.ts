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
import { demoTrade } from "./demoTrade";
import { demoFaucetAUSD, demoRedeem, demoWalletSnapshot, invalidateDemoWalletCache } from "./demoWallet";

loadEnv();

const app = new Hono();
app.use("*", cors());

/** In-flight guard — one demo trade at a time (shared hot wallet). */
let demoBusy = false;

/** Short cache so phone poll + keeper don't melt public RPC. */
let roundCache: { at: number; body: unknown } | null = null;
const ROUND_CACHE_MS = 3000;

app.get("/health", (c) => c.json({ ok: true, service: "hunch-api" }));

app.get("/v1/config", (c) => {
  const dep = loadDeployment();
  return c.json({
    chainId: dep.chainId,
    factory: dep.factory,
    collateral: dep.collateral,
    pyth: dep.pyth,
    btcUsdFeedId: dep.btcUsdFeedId,
    vault: dep.vault ?? null,
    explorer: MONAD_TESTNET.explorer,
    delayBlocks: 2,
    duration: 60,
  });
});

app.get("/v1/round/current", async (c) => {
  if (roundCache && Date.now() - roundCache.at < ROUND_CACHE_MS) {
    return c.json(roundCache.body);
  }

  try {
    const provider = getProvider();
    const factory = factoryContract(provider);
    const roundCount = Number(await factory.roundCount());
    if (roundCount === 0) {
      const body = { round: null };
      roundCache = { at: Date.now(), body };
      return c.json(body);
    }

    const roundId = String(roundCount);
    const market = (await factory.rounds(roundCount)) as string;
    const m = marketContract(market, provider);

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

    const body = {
      round: {
        roundId,
        market,
        feedId: feedId as string,
        seed: "0",
        strike: strike.toString(),
        expo: -8,
        startTime: Number(startTime),
        expiry: expiryN,
        status: statusNum === 0 ? "open" : "resolved",
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
    roundCache = { at: Date.now(), body };
    return c.json(body);
  } catch (e: any) {
    if (roundCache) return c.json(roundCache.body);
    const msg = e.shortMessage || e.message || String(e);
    const rateLimited = /rate limit|Too many requests|-32090/i.test(msg);
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

/** Demo: server wallet executes trade until Privy/ZeroDev is wired on iOS */
/** Demo wallet: AUSD + MON + open/resolved positions (shared hot wallet) */
app.get("/v1/demo/me", async (c) => {
  try {
    return c.json(await demoWalletSnapshot());
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  }
});

app.post("/v1/demo/faucet", async (c) => {
  try {
    const body = await c.req.json<{ amountAUSD?: string }>().catch(() => ({} as { amountAUSD?: string }));
    return c.json(await demoFaucetAUSD(body.amountAUSD || "1000"));
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  }
});

app.post("/v1/demo/redeem", async (c) => {
  try {
    const body = await c.req.json<{ roundId: string | number }>();
    const id = Number(body.roundId);
    if (!Number.isFinite(id)) return c.json({ error: "roundId required" }, 400);
    return c.json(await demoRedeem(id));
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  }
});

app.post("/v1/demo/trade", async (c) => {
  const body = await c.req.json<{ side: "UP" | "DOWN" | "YES" | "NO"; amountAUSD?: string }>();
  const sideRaw = (body.side || "").toUpperCase();
  const side: "YES" | "NO" =
    sideRaw === "UP" || sideRaw === "YES" ? "YES" : sideRaw === "DOWN" || sideRaw === "NO" ? "NO" : null!;
  if (!side) return c.json({ error: "side must be UP/DOWN or YES/NO" }, 400);
  if (demoBusy) return c.json({ error: "trade in progress — retry in a few seconds" }, 429);
  demoBusy = true;
  try {
    const result = await demoTrade(side, body.amountAUSD || "10");
    invalidateDemoWalletCache();
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message || String(e) }, 500);
  } finally {
    demoBusy = false;
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
  const body = await c.req.json<{ side: "YES" | "NO"; amountAUSD: string; minShares?: string }>();
  await syncIndex();
  const row = currentRound(readStore()) as RoundRow | null;
  if (!row || row.status !== "open") return c.json({ error: "no open round" }, 400);
  const amount = ethers.parseUnits(body.amountAUSD, 6);
  const minShares = ethers.parseUnits(body.minShares || "0", 6);
  const dep = loadDeployment();
  return c.json({
    chainId: dep.chainId,
    market: row.market,
    collateral: dep.collateral.address,
    approve: {
      to: dep.collateral.address,
      data: ausdContract(getProvider()).interface.encodeFunctionData("approve", [row.market, amount]),
      value: "0",
    },
    commit: buildCommitCalldata(row.market, body.side, amount, minShares),
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

const port = Number(process.env.API_PORT || 8787);
const hostname = process.env.API_HOST || "0.0.0.0";
console.log(`[api] http://localhost:${port} (bound ${hostname})`);
serve({ fetch: app.fetch, port, hostname });
