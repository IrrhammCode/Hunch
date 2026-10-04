import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { colors, type, monoStyle } from "../theme";
import { PriceDirection } from "../hooks/useLivePrice";

interface AnimatedLiveTickerProps {
  price: number;
  prevPrice?: number | null;
  direction?: PriceDirection;
  delta?: number;
  tickCount?: number;
  size?: "sm" | "md" | "lg" | "hero";
  strike?: number | null;
  showBadge?: boolean;
  showLivePulse?: boolean;
  prefix?: string;
  style?: ViewStyle;
}

export function AnimatedLiveTicker({
  price,
  direction = "same",
  delta = 0,
  tickCount = 0,
  size = "md",
  strike,
  showBadge = true,
  showLivePulse = true,
  prefix = "$",
  style,
}: AnimatedLiveTickerProps) {
  const flashProgress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (tickCount > 0 && direction !== "same") {
      // Trigger smooth bounce
      scale.value = withSequence(
        withTiming(1.05, { duration: 130 }),
        withTiming(1, { duration: 250 }),
      );
      // Trigger flash transition
      flashProgress.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 800 }),
      );
    }
  }, [tickCount, direction, flashProgress, scale]);

  const animatedTextStyle = useAnimatedStyle(() => {
    const flashColor = direction === "up" ? colors.up : colors.down;
    const baseColor = "#FFFFFF";

    return {
      transform: [{ scale: scale.value }],
      color: interpolateColor(
        flashProgress.value,
        [0, 1],
        [baseColor, flashColor],
      ),
    };
  });

  const animatedBadgeGlow = useAnimatedStyle(() => {
    const flashBg =
      direction === "up" ? "rgba(46, 229, 157, 0.28)" : "rgba(255, 90, 95, 0.28)";
    const baseBg = "transparent";

    return {
      backgroundColor: interpolateColor(
        flashProgress.value,
        [0, 1],
        [baseBg, flashBg],
      ),
    };
  });

  const formattedPrice = useMemo(() => {
    if (price == null || isNaN(price) || price === 0) return "—";
    if (price >= 1000) {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      });
    }
    if (price < 1) {
      return price.toFixed(4);
    }
    return price.toFixed(2);
  }, [price]);

  const formattedDelta = useMemo(() => {
    if (!delta || Math.abs(delta) < 0.0001) return null;
    const sign = delta > 0 ? "+" : "";
    if (Math.abs(delta) >= 1) {
      return `${sign}${delta.toFixed(2)}`;
    }
    return `${sign}${delta.toFixed(3)}`;
  }, [delta]);

  // Strike difference comparison if strike is provided
  const strikeDiff = useMemo(() => {
    if (strike == null || isNaN(strike) || strike <= 0 || !price) return null;
    const diff = price - strike;
    const inMoney = diff >= 0;
    const diffFormatted = Math.abs(diff) >= 1 ? Math.abs(diff).toFixed(2) : Math.abs(diff).toFixed(4);
    return {
      diff,
      inMoney,
      text: inMoney ? `+$${diffFormatted} (UP WINNING)` : `-$${diffFormatted} (DOWN WINNING)`,
    };
  }, [price, strike]);

  // Font size config based on size prop
  const fontSizes = {
    sm: { price: 15, badge: 10 },
    md: { price: 18, badge: 11 },
    lg: { price: 24, badge: 12 },
    hero: { price: 34, badge: 13 },
  }[size];

  return (
    <View style={[styles.container, style]}>
      {/* Price with Live Pulse & Animated Color */}
      <View style={styles.priceRow}>
        {showLivePulse && (
          <View style={styles.liveIndicator}>
            <View
              style={[
                styles.liveDot,
                direction === "down" ? styles.liveDotDown : styles.liveDotUp,
              ]}
            />
          </View>
        )}

        <Animated.View style={[styles.glowWrap, animatedBadgeGlow]}>
          <View style={styles.numberFlexRow}>
            <Text style={[styles.prefix, { fontSize: fontSizes.price * 0.7 }]}>
              {prefix}
            </Text>
            <Animated.Text
              style={[
                styles.priceText,
                { fontSize: fontSizes.price },
                animatedTextStyle,
              ]}
            >
              {formattedPrice}
            </Animated.Text>
          </View>
        </Animated.View>

        {/* Real-time Tick Delta Badge */}
        {showBadge && formattedDelta && (
          <Animated.View
            style={[
              styles.deltaBadge,
              direction === "down" ? styles.deltaBadgeDown : styles.deltaBadgeUp,
            ]}
          >
            <Text
              style={[
                styles.deltaText,
                { fontSize: fontSizes.badge },
                direction === "down" ? styles.deltaTextDown : styles.deltaTextUp,
              ]}
            >
              {direction === "up" ? "▲ " : "▼ "}
              {formattedDelta}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Optional Strike Comparison Row (for 60s Blitz) */}
      {strikeDiff && (
        <View style={styles.strikeDiffRow}>
          <Text
            style={[
              styles.strikeDiffText,
              strikeDiff.inMoney ? styles.strikeDiffUp : styles.strikeDiffDown,
            ]}
          >
            {strikeDiff.inMoney ? "▲ " : "▼ "}
            {strikeDiff.text}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveIndicator: {
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveDotUp: {
    backgroundColor: colors.up,
    shadowColor: colors.up,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  liveDotDown: {
    backgroundColor: colors.down,
    shadowColor: colors.down,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  glowWrap: {
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  numberFlexRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
  },
  prefix: {
    fontFamily: type.data,
    fontWeight: "700",
    color: colors.muted,
  },
  priceText: {
    fontFamily: type.data,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  deltaBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deltaBadgeUp: {
    backgroundColor: "rgba(46, 229, 157, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(46, 229, 157, 0.3)",
  },
  deltaBadgeDown: {
    backgroundColor: "rgba(255, 90, 95, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 90, 95, 0.3)",
  },
  deltaText: {
    fontFamily: type.data,
    fontWeight: "700",
  },
  deltaTextUp: {
    color: colors.up,
  },
  deltaTextDown: {
    color: colors.down,
  },
  strikeDiffRow: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  strikeDiffText: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  strikeDiffUp: {
    color: colors.up,
  },
  strikeDiffDown: {
    color: colors.down,
  },
});
