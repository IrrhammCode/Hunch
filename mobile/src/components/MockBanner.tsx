import { Text, View, StyleSheet } from "react-native";
import { USE_MOCK } from "@/src/config/chain";
import { colors, type } from "@/src/theme";

/** Persistent banner when mock design mode is on. */
export function MockBanner() {
  if (!USE_MOCK) return null;
  return (
    <View style={styles.bar}>
      <Text style={styles.text}>
        MOCK DESIGN MODE · charts & fills are fixtures · EXPO_PUBLIC_USE_MOCK=0 for live
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "rgba(214,255,63,0.16)",
    borderWidth: 1,
    borderColor: "rgba(214,255,63,0.45)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 0.6,
    textAlign: "center",
  },
});
