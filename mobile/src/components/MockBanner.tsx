import { Text, View, StyleSheet } from "react-native";
import { USE_MOCK } from "@/src/config/chain";
import { colors, type } from "@/src/theme";

/** MockBanner is disabled — the app runs 100% live. */
export function MockBanner() {
  return null;
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "#18240D",
    borderWidth: 1.5,
    borderColor: "#D6FF3F",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  text: {
    color: "#D6FF3F",
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    textAlign: "center",
  },
});
