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
  const icon =
    label === "MARKETS"
      ? "📊"
      : label === "TRADE"
        ? "⚡"
        : label === "PORTFOLIO"
          ? "💼"
          : "👤";

  return (
    <View style={styles.iconWrap}>
      <View style={styles.iconContainer}>
        <Text style={[styles.glyph, focused ? styles.glyphActive : styles.glyphIdle]}>{icon}</Text>
        {label === "PORTFOLIO" ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>1</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.iconLabel,
          focused ? styles.focusedBrand : styles.idle,
        ]}
      >
        {label}
      </Text>
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
    backgroundColor: "#0A0B0D",
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 8,
    paddingBottom: 20,
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
    gap: 3,
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    fontSize: 18,
  },
  glyphActive: {
    opacity: 1,
  },
  glyphIdle: {
    opacity: 0.5,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: colors.brand,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#000000",
    fontSize: 9,
    fontFamily: type.bold,
    lineHeight: 11,
  },
  iconLabel: {
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  focusedBrand: {
    color: colors.brand,
  },
  idle: {
    color: colors.muted,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
