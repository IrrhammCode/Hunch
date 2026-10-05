import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { getMarketHeat } from "@/src/config/markets";
import { Icon } from "@/src/components/Icon";
import { colors, radius, space, type, monoStyle } from "@/src/theme";
import { haptic as hapticFx } from "@/src/utils/clipboard";

interface MarketHeatBannerProps {
  symbol: string;
  currentMode: "perps" | "hunch";
  onSwitchMode?: (mode: "perps" | "hunch") => void;
  compact?: boolean;
}

export function MarketHeatBanner({
  symbol,
  currentMode,
  onSwitchMode,
  compact = false,
}: MarketHeatBannerProps) {
  const heat = getMarketHeat(symbol);
  const isRecommended =
    (heat.recommendedMode === "blitz" && currentMode === "hunch") ||
    (heat.recommendedMode === "perps" && currentMode === "perps");

  const targetMode = heat.recommendedMode === "blitz" ? "hunch" : "perps";

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: heat.tier === "HOT" ? "rgba(255, 85, 51, 0.35)" : heat.tier === "STEADY" ? "rgba(51, 181, 229, 0.35)" : "rgba(214, 255, 63, 0.3)",
          backgroundColor: heat.tier === "HOT" ? "rgba(255, 85, 51, 0.08)" : heat.tier === "STEADY" ? "rgba(51, 181, 229, 0.08)" : "rgba(214, 255, 63, 0.06)",
        },
        compact && styles.containerCompact,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.badgeWrap}>
          <View
            style={[
              styles.pulseDot,
              { backgroundColor: heat.accentColor },
            ]}
          />
          <Text style={[styles.badgeText, { color: heat.accentColor }]}>
            {heat.modeBadge}
          </Text>
        </View>

        {isRecommended ? (
          <View style={styles.optimalTag}>
            <Icon name="checkmark" size={12} color={colors.brand} />
            <Text style={styles.optimalText}>OPTIMAL MODE</Text>
          </View>
        ) : onSwitchMode ? (
          <Pressable
            onPress={() => {
              hapticFx("medium");
              onSwitchMode(targetMode);
            }}
            style={[styles.switchBtn, { borderColor: heat.accentColor }]}
            hitSlop={8}
          >
            <Text style={[styles.switchBtnText, { color: heat.accentColor }]}>
              {heat.actionText} →
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!compact && (
        <View style={styles.bodyWrap}>
          <Text style={styles.explanationText}>
            <Text style={{ fontFamily: type.bold, color: colors.ink }}>{heat.headline}: </Text>
            {heat.explanation}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginVertical: 4,
    gap: 6,
  },
  containerCompact: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginVertical: 2,
    gap: 0,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  optimalTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(214, 255, 63, 0.12)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  optimalText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  switchBtn: {
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  switchBtnText: {
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  bodyWrap: {
    marginTop: 2,
  },
  explanationText: {
    fontFamily: type.body,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },
});
