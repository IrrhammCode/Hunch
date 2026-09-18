import React from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export type IconName = keyof typeof Ionicons.glyphMap;

/** Real Ionicons — never emoji in product UI. */
export function Icon({
  name,
  size = 18,
  color = colors.ink,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Ionicons name={name} size={size} color={color} style={style as any} />;
}

/** Asset glyph for market logos (₿ ETH S) — typographic, not emoji rockets. */
export function AssetGlyph({
  symbol,
  size = 16,
  color = colors.brand,
}: {
  symbol: string;
  size?: number;
  color?: string;
}) {
  const s = (symbol || "").toUpperCase();
  const glyph =
    s === "BTC"
      ? "₿"
      : s === "ETH"
        ? "Ξ"
        : s === "SOL"
          ? "◎"
          : s === "MON"
            ? "M"
            : s.charAt(0);
  return (
    <Text
      style={{
        color,
        fontSize: size,
        fontFamily: "DMSans_700Bold",
        lineHeight: size * 1.2,
      }}
    >
      {glyph}
    </Text>
  );
}

export const iconColor = colors;
