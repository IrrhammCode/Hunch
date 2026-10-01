import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "hunch.book.v1";
const memory: { entries: HunchEntry[] } = { entries: [] };

export type HunchEntry = {
  id: string;
  roundId: string;
  side: "UP" | "DOWN";
  amountAUSD: string;
  yes: string;
  no: string;
  tx: string;
  status: "open" | "won" | "lost";
  at: number;
  hedgedPerpId?: string;
  hedgeSide?: "LONG" | "SHORT";
  hedgeMarginAUSD?: number;
};

async function readRaw(): Promise<HunchEntry[]> {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as HunchEntry[]) : memory.entries;
    }
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw) return JSON.parse(raw) as HunchEntry[];
  } catch {
    /* fall through */
  }
  return memory.entries;
}

async function writeRaw(entries: HunchEntry[]) {
  memory.entries = entries;
  const raw = JSON.stringify(entries.slice(0, 40));
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem(KEY, raw);
      return;
    }
    await SecureStore.setItemAsync(KEY, raw);
  } catch {
    /* memory only */
  }
}

export async function listHunches() {
  return readRaw();
}

export async function addHunch(entry: Omit<HunchEntry, "id" | "at" | "status">) {
  const entries = await readRaw();
  const next: HunchEntry = {
    ...entry,
    id: `${entry.roundId}-${Date.now()}`,
    status: "open",
    at: Date.now(),
  };
  await writeRaw([next, ...entries]);
  return next;
}

export async function settleRound(roundId: string, yesWins: boolean) {
  const entries = await readRaw();
  let changed = false;
  const settled: HunchEntry[] = [];
  const next = entries.map((e) => {
    if (e.roundId !== roundId || e.status !== "open") return e;
    const won = e.side === "UP" ? yesWins : !yesWins;
    changed = true;
    const row = { ...e, status: (won ? "won" : "lost") as "won" | "lost" };
    settled.push(row);
    return row;
  });
  if (changed) await writeRaw(next);
  return settled;
}
