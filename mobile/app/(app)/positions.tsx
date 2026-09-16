import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { demoRedeem } from "@/src/api/client";
import { Screen } from "@/src/components/Screen";
import { PrimaryButton } from "@/src/components/ui";
import { useWallet } from "@/src/wallet/WalletContext";
import { colors, space } from "@/src/theme";

export default function PositionsScreen() {
  const insets = useSafeAreaInsets();
  const { me, error, refresh } = useWallet();
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const positions = me?.positions ?? [];
  const openCount = positions.filter((p) => p.status === "open").length;
  const redeemable = positions.filter((p) => p.redeemable);

  const onRedeem = async (roundId: string) => {
    setBusyId(roundId);
    try {
      const r = await demoRedeem(roundId);
      await refresh();
      Alert.alert("Redeemed", `+${r.payout} AUSD · ${r.sideWon} won\n${r.tx.slice(0, 12)}…`);
    } catch (e) {
      Alert.alert("Redeem failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>BOOK</Text>
            <Text style={styles.sub}>
              {openCount} open · {redeemable.length} to claim
            </Text>
          </View>
          <Pressable onPress={refresh}>
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.balRow}>
          <View style={styles.balCard}>
            <Text style={styles.balLabel}>AUSD</Text>
            <Text style={styles.balValue}>{me ? Number(me.ausd).toFixed(2) : "—"}</Text>
          </View>
          <View style={styles.balCard}>
            <Text style={styles.balLabel}>MON</Text>
            <Text style={styles.balValue}>{me ? Number(me.mon).toFixed(3) : "—"}</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {positions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No positions on-chain</Text>
            <Text style={styles.emptyBody}>
              Place an UP/DOWN hunch first. Shares show here from the demo wallet.
            </Text>
          </View>
        ) : (
          positions.map((p) => {
            const side =
              Number(p.yes) > 0 && Number(p.no) > 0
                ? `UP ${p.yes} / DOWN ${p.no}`
                : Number(p.yes) > 0
                  ? `UP ${p.yes}`
                  : `DOWN ${p.no}`;
            const outcome =
              p.status === "open"
                ? "OPEN"
                : p.yesWins === true
                  ? "UP WON"
                  : p.yesWins === false
                    ? "DOWN WON"
                    : "RESOLVED";
            const youWon =
              p.status === "resolved" &&
              ((p.yesWins && Number(p.yes) > 0) || (!p.yesWins && Number(p.no) > 0));
            const youLost =
              p.status === "resolved" &&
              ((p.yesWins && Number(p.no) > 0 && Number(p.yes) === 0) ||
                (!p.yesWins && Number(p.yes) > 0 && Number(p.no) === 0));

            return (
              <View key={p.roundId} style={styles.row}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.rowTitle}>Round {p.roundId}</Text>
                  <Text style={styles.rowMeta}>{side}</Text>
                  <Text
                    style={[
                      styles.outcome,
                      youWon && { color: colors.up },
                      youLost && { color: colors.down },
                      p.status === "open" && { color: colors.brand },
                    ]}
                  >
                    {youWon ? "YOU WON" : youLost ? "YOU LOST" : outcome}
                    {p.redeemable ? ` · claim ${p.estimatedPayout} AUSD` : ""}
                  </Text>
                </View>
                {p.redeemable ? (
                  <PrimaryButton
                    label={busyId === p.roundId ? "…" : "Claim"}
                    tone="brand"
                    disabled={busyId !== null}
                    onPress={() => onRedeem(p.roundId)}
                  />
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.lg, gap: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 48,
    letterSpacing: 1,
  },
  sub: { color: colors.muted, fontFamily: "DMSans_400Regular", fontSize: 14 },
  refresh: { color: colors.muted, fontFamily: "DMSans_500Medium", fontSize: 13, marginTop: 8 },
  balRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  balCard: {
    flex: 1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: space.md,
    backgroundColor: colors.bgElevated,
    gap: 4,
  },
  balLabel: {
    color: colors.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    letterSpacing: 1,
  },
  balValue: { color: colors.ink, fontFamily: "DMSans_700Bold", fontSize: 20 },
  error: { color: colors.danger, fontFamily: "DMSans_400Regular", fontSize: 13 },
  empty: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: space.lg,
    backgroundColor: colors.bgElevated,
    gap: 8,
  },
  emptyTitle: { color: colors.ink, fontFamily: "DMSans_700Bold", fontSize: 17 },
  emptyBody: { color: colors.muted, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: space.md,
    backgroundColor: colors.bgElevated,
  },
  rowTitle: { color: colors.ink, fontFamily: "DMSans_700Bold", fontSize: 16 },
  rowMeta: { color: colors.muted, fontFamily: "DMSans_400Regular", fontSize: 13 },
  outcome: { color: colors.muted, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 0.5 },
});
