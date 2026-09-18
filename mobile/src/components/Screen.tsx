import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type ViewProps } from "react-native";
import { colors } from "../theme";

/** Clean dark shell — no orbs. One quiet top→bottom wash only. */
export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <LinearGradient
        colors={["#0E110C", colors.bg]}
        locations={[0, 0.45]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: colors.bg,
  },
});
