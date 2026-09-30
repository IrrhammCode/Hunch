from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\src\api\price.ts")
t = p.read_text(encoding="utf-8")
old = """export async function fetchLatestPrice(symbol: string) {
  const s = normalizeSymbol(symbol);
  const feed = marketBySymbol(s)?.feedId || feedIdFor(s);
  const id = feed.startsWith("0x") ? feed.slice(2) : feed;
  const json = await hermesGet(`/v2/updates/price/latest?ids[]=${id}&encoding=hex`);
  const p = json?.parsed?.[0]?.price;
  if (!p) throw new Error("Pyth latest empty");"""
new = """export async function fetchLatestPrice(symbol: string) {
  const s = normalizeSymbol(symbol);
  const feed = marketBySymbol(s)?.feedId || feedIdFor(s);
  const id = feed.startsWith("0x") ? feed.slice(2) : feed;
  let p: any = null;
  try {
    const json = await hermesGet(`/v2/updates/price/latest?ids[]=${id}&encoding=hex`);
    p = json?.parsed?.[0]?.price;
  } catch {
    p = null;
  }
  if (!p) {
    // Fallback: CoinGecko simple price (chart source already used for history)
    const cgId = CG_IDS[s] || (s === "MON" ? "monad" : undefined);
    if (cgId) {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`,
      );
      if (res.ok) {
        const j = (await res.json()) as any;
        const usd = j?.[cgId]?.usd;
        if (typeof usd === "number") {
          return {
            symbol: s,
            price: usd,
            conf: usd * 0.0001,
            expo: -8,
            publishTime: Math.floor(Date.now() / 1000),
            feedId: feed,
          };
        }
      }
    }
    throw new Error("Pyth latest empty");
  }"""
if old not in t:
    print("pattern missing")
else:
    t = t.replace(old, new)
    p.write_text(t, encoding="utf-8")
    print("price fallback added")
