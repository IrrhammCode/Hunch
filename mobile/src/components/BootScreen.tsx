import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "./Screen";
import { colors, radius, type } from "../theme";

const LOGO_IMG = require("../../assets/images/hunch-logo-transparent.png");

/**
 * Premium Web3 Boot / Splash screen.
 * Dead-centered with ambient radial halo, pulsing emblem, laser progress bar, and Monad badge.
 */
export function BootScreen({ label = "Starting" }: { label?: string }) {
  const insets = useSafeAreaInsets();

  // Subtle breathing pulse for the logo and halo
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.12);
  const progressX = useSharedValue(-44);
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    // Breathing scale animation
    scale.value = withRepeat(
      withTiming(1.05, {
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    // Glow pulse animation
    glowOpacity.value = withRepeat(
      withTiming(0.22, {
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    // Scanning progress laser bar
    progressX.value = withRepeat(
      withTiming(140, {
        duration: 1100,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      -1,
      false
    );

    // Dot pulse
    dotOpacity.value = withRepeat(
      withTiming(0.35, {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(glowOpacity);
      cancelAnimation(progressX);
      cancelAnimation(dotOpacity);
    };
  }, [scale, glowOpacity, progressX, dotOpacity]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: scale.value * 1.05 }],
  }));

  const progressAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progressX.value }],
  }));

  const dotAnimStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <Screen style={styles.screen}>
      {/* Absolute dead center hero content */}
      <View style={styles.centerContainer} pointerEvents="none">
        {/* Ambient radial halo behind logo */}
        <Animated.View style={[styles.halo, glowAnimStyle]} />

        {/* Pulsing Hunch Logo Emblem */}
        <Animated.View style={[styles.logoWrap, logoAnimStyle]}>
          <Image source={LOGO_IMG} style={styles.logoImage} resizeMode="contain" />
        </Animated.View>

        {/* Brand Wordmark */}
        <Text style={styles.title}>HUNCH</Text>

        {/* Terminal Subtitle Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>MONAD DEX TERMINAL</Text>
        </View>

        {/* High-tech Laser Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressAnimStyle]} />
        </View>

        {/* Loading status text */}
        <Text style={styles.label}>{label.toUpperCase()}…</Text>
      </View>

      {/* Anchored footer badge */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets?.bottom ?? 0, 16) + 12 },
        ]}
      >
        <View style={styles.footerRow}>
          <Animated.View style={[styles.pulseDot, dotAnimStyle]} />
          <Text style={styles.footerText}>POWERED BY MONAD & AGORA AUSD</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
  },
  centerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  halo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.brand,
  },
  logoWrap: {
    width: 78,
    height: 78,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  logoImage: {
    width: 78,
    height: 78,
  },
  title: {
    color: colors.brand,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 4,
    lineHeight: 44,
    textAlign: "center",
  },
  badge: {
    backgroundColor: "rgba(214, 255, 63, 0.08)",
    borderColor: "rgba(214, 255, 63, 0.22)",
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },
  badgeText: {
    color: colors.brand,
    fontFamily: type.medium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  progressTrack: {
    width: 140,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    marginTop: 26,
  },
  progressFill: {
    width: 44,
    height: 3,
    backgroundColor: colors.brand,
    borderRadius: 2,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  label: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 12,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.up,
  },
  footerText: {
    color: "rgba(242, 241, 236, 0.45)",
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 1.2,
  },
});
