import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type ViewProps } from "react-native";
import { colors } from "../theme";

/** Soft atmosphere — not flat void, not rainbow. */
export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <LinearGradient
        colors={["#10160F", colors.bg, "#0A0B0D"]}
        locations={[0, 0.32, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow} />
      <View style={styles.glowLow} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  glow: {
    position: "absolute",
    top: -100,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: "rgba(214,255,63,0.06)",
  },
  glowLow: {
    position: "absolute",
    bottom: 40,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(46,229,157,0.04)",
  },
});
