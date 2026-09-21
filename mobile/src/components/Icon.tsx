import React from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export type IconName = keyof typeof Ionicons.glyphMap;

/** Safe names — fallback if a glyph is missing in the installed icon font. */
const FALLBACK: IconName = "ellipse";

function safeName(name: string): IconName {
  try {
    const map = (Ionicons as any).glyphMap || {};
    if (map[name]) return name as IconName;
    // common aliases
    const alt: Record<string, IconName> = {
      refresh: "refresh",
      "stats-chart": "stats-chart",
      "trending-up": "trending-up",
      "time-outline": "time-outline",
      "qr-code-outline": "qr-code-outline",
      "sparkles-outline": "sparkles-outline",
      "water-outline": "water-outline",
      "shield-checkmark-outline": "shield-checkmark-outline",
      "arrow-back": "arrow-back",
      "settings-outline": "settings-outline",
      "person-circle": "person-circle",
      "copy-outline": "copy-outline",
    };
    return alt[name] || FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** Real Ionicons — never emoji in product UI. */
export function Icon({
  name,
  size = 18,
  color = colors.ink,
  style,
}: {
  name: IconName | string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Ionicons name={safeName(String(name))} size={size} color={color} style={style as any} />
  );
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
