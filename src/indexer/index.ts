import fs from "fs";
import path from "path";
import {
  factoryContract,
  getProvider,
  loadDeployment,
  loadEnv,
  marketContract,
} from "../shared/chain";

loadEnv();

/** Monad public RPC: eth_getLogs limited to 100-block ranges. */
const LOG_CHUNK = 100;

export type RoundRow = {
  roundId: string;
  market: string;
  feedId: string;
  seed: string;
  strike?: string;
  expo?: number;
  startTime?: number;
  expiry?: number;
  status: "open" | "resolved";
  yesWins?: boolean;
  settlement?: string;
  createdAt: number;
  updatedAt: number;
};

export type TradeRow = {
  id: string;
  roundId: string;
  market: string;
  trader: string;
  side: "YES" | "NO";
  collateralIn?: string;
  sharesOut?: string;
  txHash: string;
  blockNumber: number;
  at: number;
};

type Store = {
  cursorBlock: number;
  rounds: Record<string, RoundRow>;
  trades: TradeRow[];
};

const DATA = path.join(__dirname, "..", "..", "data", "index.json");

function empty(): Store {
  return { cursorBlock: 0, rounds: {}, trades: [] };
}

export function readStore(): Store {
  if (!fs.existsSync(DATA)) return empty();
  return JSON.parse(fs.readFileSync(DATA, "utf8"));
}

function writeStore(s: Store) {
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(s, null, 2));
}

async function queryLogsChunked(
  contract: { queryFilter: (filter: any, from: number, to: number) => Promise<any[]> },
  filter: any,
  fromBlock: number,
  toBlock: number
) {
  const out: any[] = [];
  for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK) {
    const end = Math.min(start + LOG_CHUNK - 1, toBlock);
    const chunk = await contract.queryFilter(filter, start, end);
    out.push(...chunk);
  }
  return out;
}

/** Prefer on-chain roundCount snapshot — no eth_getLogs needed for current state. */
async function syncFromChainState(store: Store): Promise<Store> {
  const provider = getProvider();
  const dep = loadDeployment();
  const factory = factoryContract(provider, dep);
  const roundCount = Number(await factory.roundCount());

  // Only last few rounds — full lookback melts public RPC (15 req/s).
  const lookback = Math.min(roundCount, Number(process.env.INDEXER_LOOKBACK || 3));
  const ids: number[] = [];
  for (let id = Math.max(1, roundCount - lookback + 1); id <= roundCount; id++) ids.push(id);

  await Promise.all(
    ids.map(async (id) => {
      const roundId = String(id);
      try {
        const market = (await factory.rounds(id)) as string;
        if (!market || market === "0x0000000000000000000000000000000000000000") return;

        const m = marketContract(market, provider);
        const [statusRaw, feedId, strike, expo, startTime, expiry] = await Promise.all([
          m.status(),
          m.priceFeedId(),
          m.strikePrice(),
          m.strikeExpo(),
          m.startTime(),
          m.expiry(),
        ]);
        const statusNum = Number(statusRaw);
        let yesWins: boolean | undefined;
        let settlement: string | undefined;
        if (statusNum === 1) {
          const [yw, sp] = await Promise.all([m.yesWins(), m.settlementPrice()]);
          yesWins = Boolean(yw);
          settlement = sp.toString();
        }

        store.rounds[roundId] = {
          roundId,
          market,
          feedId: feedId as string,
          seed: store.rounds[roundId]?.seed ?? "0",
          strike: strike.toString(),
          expo: Number(expo),
          startTime: Number(startTime),
          expiry: Number(expiry),
          status: statusNum === 0 ? "open" : "resolved",
          yesWins,
          settlement,
          createdAt: store.rounds[roundId]?.createdAt ?? Date.now(),
          updatedAt: Date.now(),
        };
      } catch (e: any) {
        // Keep previous snapshot for this round if RPC flakes
        const msg = e.shortMessage || e.message || "";
        if (!/rate limit|missing revert|Too many/i.test(msg)) {
          console.warn("[indexer] round", roundId, msg);
        }
      }
    }),
  );

  try {
    store.cursorBlock = await provider.getBlockNumber();
  } catch {
    /* keep previous cursor */
  }
  return store;
}

export async function syncIndex(_fromBlock?: number) {
  const provider = getProvider();
  const dep = loadDeployment();
  const factory = factoryContract(provider, dep);
  let store = readStore();
  let latest = store.cursorBlock;
  try {
    latest = await provider.getBlockNumber();
  } catch {
    // fall through with cache
  }

  store = await syncFromChainState(store);

  // Log backfill off by default — enable with INDEXER_LOGS=1
  if (process.env.INDEXER_LOGS === "1") {
    const start = store.cursorBlock > 0 ? Math.max(store.cursorBlock - 1, latest - 200) : Math.max(0, latest - 100);
    try {
      const created = await queryLogsChunked(factory, factory.filters.RoundCreated(), start, latest);
      for (const ev of created) {
        const args = (ev as any).args;
        const roundId = args.roundId.toString();
        const prev = store.rounds[roundId];
        store.rounds[roundId] = {
          ...(prev || {
            roundId,
            market: args.market,
            feedId: args.feedId,
            status: "open" as const,
            createdAt: Date.now(),
          }),
          market: args.market,
          feedId: args.feedId,
          seed: args.seed.toString(),
          updatedAt: Date.now(),
        };
      }
    } catch (e: any) {
      console.warn("[indexer] log backfill skipped:", e.shortMessage || e.message);
    }
  }

  store.cursorBlock = latest || store.cursorBlock;
  writeStore(store);
  return store;
}

export function currentRound(store = readStore()): RoundRow | null {
  const ids = Object.keys(store.rounds)
    .map(Number)
    .sort((a, b) => b - a);
  if (!ids.length) return null;
  return store.rounds[String(ids[0])] ?? null;
}

async function main() {
  let poll = Number(process.env.INDEXER_POLL_MS || 15000);
  console.log("[indexer] polling every", poll, "ms — lookback", process.env.INDEXER_LOOKBACK || 3);
  console.log("[indexer] optional for mobile demo (API reads chain directly). Ctrl+C to stop.");
  for (;;) {
    try {
      const s = await syncIndex();
      const cur = currentRound(s);
      console.log(
        "[indexer] rounds",
        Object.keys(s.rounds).length,
        "trades",
        s.trades.length,
        "current",
        cur?.roundId,
        cur?.status,
        "block",
        s.cursorBlock,
      );
      poll = Number(process.env.INDEXER_POLL_MS || 15000);
    } catch (e: any) {
      const msg = e.shortMessage || e.message || String(e);
      const rateLimited = /rate limit|Too many|missing revert|15\/sec/i.test(msg);
      if (rateLimited) {
        poll = Math.min(poll * 2, 60_000);
        console.warn("[indexer] RPC busy — backoff", poll, "ms ·", msg.slice(0, 80));
      } else {
        console.error("[indexer]", msg);
      }
    }
    await new Promise((r) => setTimeout(r, poll));
  }
}

if (require.main === module) {
  main();
}
