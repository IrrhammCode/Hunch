import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, type ViewProps } from "react-native";
import { DESIGN_MODE } from "../config/chain";
import { colors, type } from "../theme";

/** Clean dark shell — no orbs, no circles. One quiet top→bottom wash only. */
export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <LinearGradient
        colors={["#0E110C", colors.bg]}
        locations={[0, 0.45]}
        style={StyleSheet.absoluteFill}
      />
      {DESIGN_MODE ? (
        <View pointerEvents="none" style={styles.designBadge}>
          <Text style={styles.designText}>DESIGN · MOCK DATA</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  designBadge: {
    position: "absolute",
    top: 6,
    alignSelf: "center",
    zIndex: 50,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(214,255,63,0.12)",
    borderWidth: 1,
    borderColor: "rgba(214,255,63,0.35)",
  },
  designText: {
    color: colors.brand,
    fontFamily: type.medium,
    fontSize: 9,
    letterSpacing: 1.4,
  },
});
