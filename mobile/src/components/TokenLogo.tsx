import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "@/src/theme";

/** Official-style PNG logos under assets/tokens. */
const TOKEN_IMAGES: Record<string, any> = {
  BTC: require("../../assets/tokens/btc.png"),
  ETH: require("../../assets/tokens/eth.png"),
  SOL: require("../../assets/tokens/sol.png"),
  MON: require("../../assets/tokens/mon.png"),
  ZEC: require("../../assets/tokens/zec.png"),
  LIT: require("../../assets/tokens/lit.png"),
  PUMP: require("../../assets/tokens/pump.png"),
  NEAR: require("../../assets/tokens/near.png"),
  BNB: require("../../assets/tokens/bnb.png"),
  XRP: require("../../assets/tokens/xrp.png"),
  DOGE: require("../../assets/tokens/doge.png"),
  ADA: require("../../assets/tokens/ada.png"),
  AVAX: require("../../assets/tokens/avax.png"),
  LINK: require("../../assets/tokens/link.png"),
  DOT: require("../../assets/tokens/dot.png"),
  LTC: require("../../assets/tokens/ltc.png"),
  BCH: require("../../assets/tokens/bch.png"),
  PEPE: require("../../assets/tokens/pepe.png"),
  WIF: require("../../assets/tokens/wif.png"),
  BONK: require("../../assets/tokens/bonk.png"),
  SHIB: require("../../assets/tokens/shib.png"),
  PYTH: require("../../assets/tokens/pyth.png"),
  USDC: require("../../assets/tokens/usdc.png"),
  USDT: require("../../assets/tokens/usdt.png"),
};

const FALLBACK_BG: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  SOL: "#14F195",
  MON: "#836EF9",
};

export function TokenLogo({
  symbol,
  size = 36,
}: {
  symbol: string;
  size?: number;
}) {
  const s = (symbol || "").toUpperCase();
  const src = TOKEN_IMAGES[s];
  if (src) {
    return (
      <Image
        source={src}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: FALLBACK_BG[s] || "#12141A",
        }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: FALLBACK_BG[s] || "#2A2F3A",
        },
      ]}
    >
      <Text
        style={{
          color: colors.ink,
          fontSize: size * 0.38,
          fontWeight: "800",
        }}
      >
        {s.charAt(0) || "?"}
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
