import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL, demoFaucet } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen";
import { PrimaryButton } from "@/src/components/ui";
import { useWallet } from "@/src/wallet/WalletContext";
import { colors, space } from "@/src/theme";

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { me, error, refresh } = useWallet();
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const onFaucet = async () => {
    setBusy(true);
    try {
      const r = await demoFaucet("1000");
      await refresh();
      Alert.alert("Faucet", `+1000 MockAUSD\nBalance ${Number(r.ausd).toFixed(2)}`);
    } catch (e) {
      Alert.alert("Faucet failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]}>
        <View style={{ gap: 8 }}>
          <Text style={styles.title}>YOU</Text>
          <Text style={styles.name}>{user?.displayName}</Text>
          <Text style={styles.meta}>{user?.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Demo trading wallet</Text>
          <Text style={styles.cardValue}>{me?.address ? shortAddr(me.address) : "…"}</Text>
          <Text style={styles.cardHint}>
            Shared hot wallet until Privy. Session login ≠ on-chain trader.
          </Text>
        </View>

        <View style={styles.balRow}>
          <View style={[styles.card, styles.half]}>
            <Text style={styles.cardLabel}>AUSD</Text>
            <Text style={styles.cardValue}>{me ? Number(me.ausd).toFixed(2) : "—"}</Text>
          </View>
          <View style={[styles.card, styles.half]}>
            <Text style={styles.cardLabel}>MON gas</Text>
            <Text style={styles.cardValue}>{me ? Number(me.mon).toFixed(3) : "—"}</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>API</Text>
          <Text style={styles.cardValueSmall}>{API_URL}</Text>
          <Text style={styles.cardHint}>Rounds indexed: {me?.roundCount ?? "—"}</Text>
        </View>

        <PrimaryButton label={busy ? "Minting…" : "Faucet +1000 AUSD"} onPress={onFaucet} disabled={busy} />
        <PrimaryButton label="Refresh balances" tone="ghost" onPress={refresh} />

        <View style={{ flex: 1 }} />
        <PrimaryButton label="Sign out" tone="ghost" onPress={onLogout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.lg, gap: space.md },
  title: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 48,
    letterSpacing: 1,
  },
  name: { color: colors.brand, fontFamily: "DMSans_700Bold", fontSize: 22 },
  meta: { color: colors.muted, fontFamily: "DMSans_400Regular", fontSize: 15 },
  balRow: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  card: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: space.lg,
    backgroundColor: colors.bgElevated,
    gap: 6,
  },
  cardLabel: {
    color: colors.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cardValue: { color: colors.ink, fontFamily: "DMSans_700Bold", fontSize: 20 },
  cardValueSmall: { color: colors.ink, fontFamily: "DMSans_400Regular", fontSize: 13 },
  cardHint: { color: colors.muted, fontFamily: "DMSans_400Regular", fontSize: 13 },
  error: { color: colors.danger, fontFamily: "DMSans_400Regular", fontSize: 13 },
});
