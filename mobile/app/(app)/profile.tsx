import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { demoFaucet } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
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
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [showDev, setShowDev] = useState(false);

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
        toast.success(
          "Funded",
          `AUSD ${Number(r.ausd).toFixed(2)} · MON ${Number(r.mon).toFixed(3)}`,
        );
      } else {
        const r = await demoFaucet("1000");
        await refresh();
        toast.success("Faucet", `+1000 AUSD · balance ${Number(r.ausd).toFixed(2)}`);
      }
    } catch (e) {
      toast.error("Faucet failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const address = user?.address || me?.address || "";

  return (
    <Screen>
      <View
        style={[
          styles.wrap,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 12 },
        ]}
      >
        {/* Identity */}
        <View style={{ gap: 6 }}>
          <Text style={styles.title}>YOU</Text>
          <Text style={styles.name}>{user?.displayName}</Text>
          <Text style={styles.meta}>{user?.email}</Text>
          <View style={{ marginTop: 6 }}>
            <StatusPill
              label={privyMode ? "Privy wallet" : "Demo wallet"}
              tone={privyMode ? "brand" : "muted"}
            />
          </View>
        </View>

        {/* Wallet */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Wallet</Text>
          <Text style={styles.addr}>{address ? shortAddr(address) : "…"}</Text>
          <Text style={styles.cardHint}>
            {privyMode
              ? "Email OTP · self-custodial on Monad."
              : "Shared hot wallet for local testing."}
          </Text>
        </View>

        {/* Balances */}
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

        {/* Actions */}
        <View style={{ gap: 10, marginTop: 4 }}>
          <PrimaryButton
            label={busy ? "Funding…" : privyMode ? "Fund wallet" : "Faucet +1000 AUSD"}
            onPress={onFaucet}
            disabled={busy || !user}
          />
          <PrimaryButton label="Refresh balances" tone="ghost" onPress={refresh} />
        </View>

        <View style={{ flex: 1 }} />

        {/* Collapsed debug — judges never see API URL by default */}
        <Pressable onPress={() => setShowDev((v) => !v)} style={styles.devToggle}>
          <Text style={styles.devToggleText}>{showDev ? "Hide dev" : "Dev"}</Text>
        </Pressable>
        {showDev ? (
          <View style={styles.devBox}>
            <Text style={styles.devLabel}>API</Text>
            <Text style={styles.devValue} numberOfLines={2}>
              {process.env.EXPO_PUBLIC_API_URL ?? "localhost:8787"}
            </Text>
            <Text style={styles.devLabel}>Rounds</Text>
            <Text style={styles.devValue}>{me?.roundCount ?? "—"}</Text>
          </View>
        ) : null}

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
  error: { color: colors.danger, fontFamily: type.body, fontSize: 13 },
  devToggle: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  devToggleText: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  devBox: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.sm,
    backgroundColor: colors.bgElevated,
    gap: 2,
  },
  devLabel: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  devValue: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 12,
  },
});
