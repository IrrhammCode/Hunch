import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

/** Wordmark. `md` for top bars, `lg` for auth heroes. */
export function BrandMark({
  size = "lg",
  tag,
}: {
  size?: "sm" | "md" | "lg";
  tag?: string;
}) {
  const scale =
    size === "lg"
      ? { word: 64, line: 64, tag: 13 }
      : size === "md"
        ? { word: 34, line: 34, tag: 0 }
        : { word: 26, line: 26, tag: 0 };

  return (
    <View style={styles.wrap}>
      <Text
        style={[
          styles.word,
          { fontSize: scale.word, lineHeight: scale.line, letterSpacing: size === "lg" ? 2.2 : 1.4 },
        ]}
      >
        HUNCH
      </Text>
      {tag ? (
        <Text style={[styles.tag, { fontSize: scale.tag || 12 }]}>{tag}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  word: {
    color: colors.brand,
    fontFamily: "BebasNeue_400Regular",
  },
  tag: {
    color: colors.muted,
    fontFamily: "DMSans_400Regular",
    letterSpacing: 0.5,
  },
});
