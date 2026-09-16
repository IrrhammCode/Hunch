import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function BrandMark({ size = "lg" }: { size?: "sm" | "lg" }) {
  const large = size === "lg";
  return (
    <View style={styles.wrap}>
      <Text style={[styles.word, large ? styles.wordLg : styles.wordSm]}>HUNCH</Text>
      {large ? <Text style={styles.tag}>60s UP / DOWN · BTC</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  word: {
    color: colors.brand,
    fontFamily: "BebasNeue_400Regular",
    letterSpacing: 2,
  },
  wordLg: { fontSize: 72, lineHeight: 72 },
  wordSm: { fontSize: 28, lineHeight: 28 },
  tag: {
    color: colors.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
