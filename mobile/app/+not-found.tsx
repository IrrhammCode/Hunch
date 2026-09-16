import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/src/components/Screen";
import { colors, type } from "@/src/theme";

export default function NotFoundScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Off the board</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to HUNCH</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  title: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 40,
    letterSpacing: 1,
  },
  link: {
    paddingVertical: 12,
  },
  linkText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 15,
  },
});
