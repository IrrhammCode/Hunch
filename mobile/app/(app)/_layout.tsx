import { Redirect, Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { BootScreen } from "@/src/components/BootScreen";
import { Icon, type IconName } from "@/src/components/Icon";
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

const TAB_ICONS: Record<string, IconName> = {
  MARKETS: "stats-chart",
  TRADE: "flash",
  PORTFOLIO: "briefcase",
  YOU: "person",
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const name = TAB_ICONS[label] ?? "ellipse";
  const color = focused ? colors.brand : colors.muted;

  return (
    <View style={styles.iconWrap}>
      <Icon name={name} size={22} color={color} />
      <Text style={[styles.iconLabel, { color }]}>{label}</Text>
      {focused ? <View style={styles.activeDot} /> : <View style={styles.dotPlaceholder} />}
    </View>
  );
}

function ArenaTabBar({ state, navigation }: TabBarProps) {
  return (
    <View style={styles.bar}>
      {state.routes.map((route, index) => {
        if (route.name === "exchange") return null;
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
      <Tabs.Screen name="exchange" options={{ href: null, title: "Exchange" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    paddingBottom: 18,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  iconWrap: {
    alignItems: "center",
    gap: 4,
  },
  iconLabel: {
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
