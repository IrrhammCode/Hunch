import { PrivyProvider } from "@privy-io/expo";
import "react-native-gesture-handler";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts,
} from "@expo-google-fonts/dm-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/src/auth/AuthContext";
import { BootScreen } from "@/src/components/BootScreen";
import { ToastProvider } from "@/src/components/Toast";
import { WalletProvider } from "@/src/wallet/WalletContext";
import {
  HAS_PRIVY,
  PRIVY_APP_ID,
  PRIVY_CLIENT_ID,
  SUPPORTED_CHAINS,
} from "@/src/config/chain";
import { colors } from "@/src/theme";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

function AppShell() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ToastProvider>
        <AuthProvider>
          <WalletProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: "fade",
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </WalletProvider>
        </AuthProvider>
      </ToastProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return <BootScreen label="Starting" />;

  if (!HAS_PRIVY) {
    return <AppShell />;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      supportedChains={SUPPORTED_CHAINS as any}
      config={{
        embedded: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <AppShell />
    </PrivyProvider>
  );
}
