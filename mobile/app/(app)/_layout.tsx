import { Redirect, Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { colors } from "@/src/theme";

function TabLabel({ label, color }: { label: string; color: ColorValue }) {
  return (
    <Text style={{ color, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 0.6 }}>
      {label}
    </Text>
  );
}

export default function AppLayout() {
  const { user, ready } = useAuth();

  if (!ready) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0E1014",
          borderTopColor: colors.line,
          height: 64,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hunch",
          tabBarLabel: ({ color }) => <TabLabel label="HUNCH" color={color} />,
        }}
      />
      <Tabs.Screen
        name="positions"
        options={{
          title: "Positions",
          tabBarLabel: ({ color }) => <TabLabel label="BOOK" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "You",
          tabBarLabel: ({ color }) => <TabLabel label="YOU" color={color} />,
        }}
      />
    </Tabs>
  );
}
