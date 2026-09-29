from pathlib import Path

token = r'''import { StyleSheet, Text, View } from "react-native";
import { colors, type } from "@/src/theme";

/** Brand colors + marks for tokens we list (Perpl testnet + Pyth majors). */
export const TOKEN_META: Record<
  string,
  { bg: string; fg: string; glyph: string; name: string }
> = {
  BTC: { bg: "#F7931A", fg: "#0A0B0D", glyph: "₿", name: "Bitcoin" },
  ETH: { bg: "#627EEA", fg: "#FFFFFF", glyph: "Ξ", name: "Ethereum" },
  SOL: { bg: "#14F195", fg: "#0A0B0D", glyph: "◎", name: "Solana" },
  MON: { bg: "#836EF9", fg: "#FFFFFF", glyph: "M", name: "Monad" },
  ZEC: { bg: "#F4B728", fg: "#0A0B0D", glyph: "Z", name: "Zcash" },
  LIT: { bg: "#3B82F6", fg: "#FFFFFF", glyph: "L", name: "Litentry" },
  PUMP: { bg: "#FF007A", fg: "#FFFFFF", glyph: "P", name: "Pump" },
  NEAR: { bg: "#00C08B", fg: "#0A0B0D", glyph: "N", name: "NEAR" },
  BNB: { bg: "#F3BA2F", fg: "#0A0B0D", glyph: "B", name: "BNB" },
  XRP: { bg: "#23292F", fg: "#FFFFFF", glyph: "X", name: "XRP" },
  DOGE: { bg: "#C2A633", fg: "#0A0B0D", glyph: "D", name: "Dogecoin" },
  ADA: { bg: "#0033AD", fg: "#FFFFFF", glyph: "A", name: "Cardano" },
  AVAX: { bg: "#E84142", fg: "#FFFFFF", glyph: "A", name: "Avalanche" },
  LINK: { bg: "#2A5ADA", fg: "#FFFFFF", glyph: "L", name: "Chainlink" },
  DOT: { bg: "#E6007A", fg: "#FFFFFF", glyph: "D", name: "Polkadot" },
  LTC: { bg: "#345D9D", fg: "#FFFFFF", glyph: "L", name: "Litecoin" },
  BCH: { bg: "#8DC351", fg: "#0A0B0D", glyph: "B", name: "Bitcoin Cash" },
  PEPE: { bg: "#3D8130", fg: "#FFFFFF", glyph: "P", name: "Pepe" },
  WIF: { bg: "#E8A87C", fg: "#0A0B0D", glyph: "W", name: "dogwifhat" },
  BONK: { bg: "#F5A623", fg: "#0A0B0D", glyph: "B", name: "Bonk" },
  SHIB: { bg: "#E4423B", fg: "#FFFFFF", glyph: "S", name: "Shiba Inu" },
  PYTH: { bg: "#E6DAFE", fg: "#4B2E83", glyph: "P", name: "Pyth" },
  USDC: { bg: "#2775CA", fg: "#FFFFFF", glyph: "$", name: "USD Coin" },
  USDT: { bg: "#26A17B", fg: "#FFFFFF", glyph: "T", name: "Tether" },
};

export function tokenMeta(symbol: string) {
  const s = (symbol || "").toUpperCase();
  return (
    TOKEN_META[s] || {
      bg: "#2A2F3A",
      fg: colors.ink,
      glyph: s.charAt(0) || "•",
      name: s,
    }
  );
}

/** Circular token logo badge (branded color + glyph). */
export function TokenLogo({
  symbol,
  size = 36,
}: {
  symbol: string;
  size?: number;
}) {
  const m = tokenMeta(symbol);
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: m.bg,
        },
      ]}
    >
      <Text
        style={{
          color: m.fg,
          fontSize: size * 0.42,
          fontWeight: "800",
          lineHeight: size * 0.48,
        }}
      >
        {m.glyph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
'''
Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\src\components\TokenLogo.tsx").write_text(token, encoding="utf-8")
print("TokenLogo written")

# --- fixtures: all 8 Perpl tokens + more blitz ---
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\src\mock\fixtures.ts")
t = p.read_text(encoding="utf-8")
old_prices = '''export const MOCK_PRICES: Record<string, number> = {
  BTC: 81240.5,
  ETH: 2655.2,
  SOL: 148.35,
  MON: 0.42,
  ZEC: 42.8,
  LIT: 1.24,
  PUMP: 0.0042,
};'''
new_prices = '''export const MOCK_PRICES: Record<string, number> = {
  BTC: 81240.5,
  ETH: 2655.2,
  SOL: 148.35,
  MON: 0.42,
  ZEC: 42.8,
  LIT: 1.24,
  PUMP: 0.0042,
  NEAR: 5.82,
};'''
if old_prices in t:
    t = t.replace(old_prices, new_prices)
else:
    print("prices block missing")

old_perp = '''    markets: [
      mk(16, "BTC", MOCK_PRICES.BTC!, -1.02),
      mk(32, "ETH", MOCK_PRICES.ETH!, 0.84),
      mk(48, "SOL", MOCK_PRICES.SOL!, 2.15),
      mk(64, "MON", MOCK_PRICES.MON!, 3.4),
      mk(256, "ZEC", MOCK_PRICES.ZEC!, -0.55),
      mk(300, "LIT", MOCK_PRICES.LIT!, 1.2),
      mk(400, "PUMP", MOCK_PRICES.PUMP!, 5.8),
    ],'''
new_perp = '''    markets: [
      mk(16, "BTC", MOCK_PRICES.BTC!, -1.02),
      mk(32, "ETH", MOCK_PRICES.ETH!, 0.84),
      mk(48, "SOL", MOCK_PRICES.SOL!, 2.15),
      mk(64, "MON", MOCK_PRICES.MON!, 3.4),
      mk(256, "ZEC", MOCK_PRICES.ZEC!, -0.55),
      mk(272, "LIT", MOCK_PRICES.LIT!, 1.2),
      mk(320, "PUMP", MOCK_PRICES.PUMP!, 5.8),
      mk(336, "NEAR", MOCK_PRICES.NEAR!, -0.72),
    ],'''
if old_perp in t:
    t = t.replace(old_perp, new_perp)
else:
    print("perp list missing")

old_board = '''    markets: [
      mk("BTC", "open", "1842", 0.56),
      mk("ETH", "open", "1843", 0.44),
      mk("SOL", "open", "1844", 0.61),
    ],'''
new_board = '''    markets: [
      mk("BTC", "open", "1842", 0.56),
      mk("ETH", "open", "1843", 0.44),
      mk("SOL", "open", "1844", 0.61),
      mk("MON", "open", "1845", 0.52),
      mk("ZEC", "open", "1846", 0.48),
      mk("NEAR", "open", "1847", 0.57),
    ],'''
if old_board in t:
    t = t.replace(old_board, new_board)
else:
    print("board list missing")

p.write_text(t, encoding="utf-8")
print("fixtures updated")
