from pathlib import Path

# Expand Hunch 60s catalog with more Pyth feeds (same IDs as public Pyth)
p = Path(r"C:\Users\Irham\Documents\code\metropolis\src\shared\markets.ts")
t = p.read_text(encoding="utf-8")
old = '''  {
    symbol: "SOL",
    pair: "SOL-USD",
    label: "SOL / USD",
    feedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    expo: -8,
  },
];'''
new = '''  {
    symbol: "SOL",
    pair: "SOL-USD",
    label: "SOL / USD",
    feedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    expo: -8,
  },
  {
    symbol: "MON",
    pair: "MON-USD",
    label: "MON / USD",
    feedId: "0x8d158bef3d2b0c4b0b0f0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e",
    expo: -8,
    placeholderFeed: true,
  },
];'''
# Don't add fake feed IDs - keep only real feeds. Skip expand if we lack official MON/ZEC/NEAR IDs.
print("keep BTC/ETH/SOL only for 60s onchain (no fake feedIds)")

# Perp ticker strip logos
p2 = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\src\perpl\PerpTradingTicket.tsx")
t2 = p2.read_text(encoding="utf-8")
if "TokenLogo" not in t2:
    t2 = t2.replace(
        'import { PriceChart } from "@/src/components/PriceChart";',
        'import { PriceChart } from "@/src/components/PriceChart";\nimport { TokenLogo } from "@/src/components/TokenLogo";',
    )
    old_pill = '''              style={[styles.stripPill, isSel && styles.stripPillActive]}
            >
              <Text style={[styles.stripSymbol, isSel && styles.stripSymbolActive]}>
                {m.symbol}
              </Text>'''
    new_pill = '''              style={[styles.stripPill, isSel && styles.stripPillActive]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <TokenLogo symbol={m.symbol} size={14} />
                <Text style={[styles.stripSymbol, isSel && styles.stripSymbolActive]}>
                  {m.symbol}
                </Text>
              </View>'''
    if old_pill in t2:
        t2 = t2.replace(old_pill, new_pill)
        print("strip logos added")
    else:
        print("strip pill missing")
    p2.write_text(t2, encoding="utf-8")
else:
    print("TokenLogo already in ticket")
print("done")
