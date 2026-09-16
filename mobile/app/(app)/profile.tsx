import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL, demoFaucet } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen";
import { PrimaryButton, StatusPill } from "@/src/components/ui";
import { fundPrivyWallet } from "@/src/wallet/privyTrade";
import { useWallet } from "@/src/wallet/WalletContext";
import { colors, radius, space, type } from "@/src/theme";

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, privyMode } = useAuth();
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
      if (privyMode && user?.address) {
        const r = await fundPrivyWallet(user.address);
        await refresh();
        Alert.alert(
          "Funded",
          `AUSD ${Number(r.ausd).toFixed(2)} · MON ${Number(r.mon).toFixed(3)}`,
        );
      } else {
        const r = await demoFaucet("1000");
        await refresh();
        Alert.alert("Faucet", `+1000 MockAUSD\nBalance ${Number(r.ausd).toFixed(2)}`);
      }
    } catch (e) {
      Alert.alert("Faucet failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const address = user?.address || me?.address || "";

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 12 }]}>
        <View style={{ gap: 6 }}>
          <Text style={styles.title}>YOU</Text>
          <Text style={styles.name}>{user?.displayName}</Text>
          <Text style={styles.meta}>{user?.email}</Text>
          <View style={{ marginTop: 6 }}>
            <StatusPill
              label={privyMode ? "Privy embedded wallet" : "Demo wallet"}
              tone={privyMode ? "brand" : "muted"}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Wallet</Text>
          <Text style={styles.addr}>{address ? shortAddr(address) : "…"}</Text>
          <Text style={styles.cardHint}>
            {privyMode
              ? "Email OTP · self-custodial on Monad testnet."
              : "Shared hot wallet. Enable Privy App ID for real trader identity."}
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

        <View style={styles.apiRow}>
          <Text style={styles.apiText} numberOfLines={1}>
            {API_URL}
          </Text>
          <Text style={styles.cardHint}>rounds {me?.roundCount ?? "—"}</Text>
        </View>

        <View style={{ gap: 10, marginTop: 4 }}>
          <PrimaryButton
            label={busy ? "Funding…" : privyMode ? "Faucet AUSD + MON" : "Faucet +1000 AUSD"}
            onPress={onFaucet}
            disabled={busy || !user}
          />
          <PrimaryButton label="Refresh balances" tone="ghost" onPress={refresh} />
        </View>

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
  name: { color: colors.brand, fontFamily: type.bold, fontSize: 22 },
  meta: { color: colors.muted, fontFamily: type.body, fontSize: 15 },
  balRow: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  card: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    backgroundColor: colors.bgElevated,
    gap: 6,
  },
  cardLabel: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cardValue: { color: colors.ink, fontFamily: type.bold, fontSize: 20 },
  addr: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 18,
    letterSpacing: 0.4,
  },
  cardHint: { color: colors.muted, fontFamily: type.body, fontSize: 13 },
  apiRow: {
    gap: 4,
  },
  apiText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
  },
  error: { color: colors.danger, fontFamily: type.body, fontSize: 13 },
});
