import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandMark } from "./BrandMark";
import { Screen } from "./Screen";
import { colors, type } from "../theme";

/** Branded boot — never a black void. Subtle opacity pulse only (no orbs). */
export function BootScreen({ label = "Loading" }: { label?: string }) {
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.45, { duration: 900 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Screen>
      <View
        style={[
          styles.wrap,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Animated.View style={markStyle}>
          <BrandMark size="md" />
        </Animated.View>
        <Text style={styles.label}>{label}…</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  label: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
