import { Redirect, Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { BootScreen } from "@/src/components/BootScreen";
import { colors, radius, type } from "@/src/theme";

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const primary = label === "TRADE" || label === "MARKETS";
  return (
    <View style={styles.iconWrap}>
      <Text
        style={[
          styles.iconLabel,
          primary && styles.iconLabelPrimary,
          focused
            ? primary
              ? styles.focusedBrand
              : styles.focusedInk
            : styles.idle,
        ]}
      >
        {label}
      </Text>
      {focused ? <View style={[styles.underline, primary && styles.underlineBrand]} /> : null}
    </View>
  );
}

function ArenaTabBar({ state, navigation }: TabBarProps) {
  return (
    <View style={styles.bar}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label =
          route.name === "index"
            ? "TRADE"
            : route.name === "markets"
              ? "MARKETS"
              : route.name === "positions"
                ? "PORTFOLIO"
                : "YOU";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.75 }]}
          >
            <TabIcon label={label} focused={focused} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AppLayout() {
  const { user, ready } = useAuth();

  if (!ready) return <BootScreen label="Signing in" />;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      tabBar={(props) => <ArenaTabBar {...(props as unknown as TabBarProps)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="markets" options={{ title: "Markets" }} />
      <Tabs.Screen name="index" options={{ title: "Trade" }} />
      <Tabs.Screen name="positions" options={{ title: "Portfolio" }} />
      <Tabs.Screen name="profile" options={{ title: "You" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#0C0E12",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    paddingBottom: 18,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  iconWrap: {
    alignItems: "center",
    gap: 6,
  },
  iconLabel: {
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 1.4,
  },
  iconLabelPrimary: {
    fontSize: 13,
    letterSpacing: 1.8,
  },
  focusedBrand: { color: colors.brand },
  focusedInk: { color: colors.ink },
  idle: { color: colors.muted },
  underline: {
    width: 22,
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  underlineBrand: {
    width: 28,
    backgroundColor: colors.brand,
  },
});
