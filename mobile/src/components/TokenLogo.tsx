import { StyleSheet, Text, View } from "react-native";
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
