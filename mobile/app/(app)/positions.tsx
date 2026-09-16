import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { demoRedeem } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { BrandMark } from "@/src/components/BrandMark";
import { Screen } from "@/src/components/Screen";
import { EmptyState, PrimaryButton, StatusPill } from "@/src/components/ui";
import { useWallet } from "@/src/wallet/WalletContext";
import { redeemPrivyPosition } from "@/src/wallet/privyTrade";
import { colors, radius, space, type } from "@/src/theme";

export default function PositionsScreen() {
  const insets = useSafeAreaInsets();
  const { me, error, refresh } = useWallet();
  const { user, privyMode, getEthereumProvider } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const positions = me?.positions ?? [];
  const openCount = positions.filter((p) => p.status === "open").length;
  const redeemable = positions.filter((p) => p.redeemable);

  const onRedeem = async (roundId: string, market: string) => {
    setBusyId(roundId);
    try {
      if (privyMode && user?.address) {
        const provider = await getEthereumProvider();
        const r = await redeemPrivyPosition({ provider, address: user.address, market });
        await refresh();
        Alert.alert("Claimed", `Payout sent\n${r.tx.slice(0, 12)}…`);
      } else {
        const r = await demoRedeem(roundId);
        await refresh();
        Alert.alert("Redeemed", `+${r.payout} AUSD · ${r.sideWon} won\n${r.tx.slice(0, 12)}…`);
      }
    } catch (e) {
      Alert.alert("Redeem failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>BOOK</Text>
            <Text style={styles.sub}>
              {openCount} open · {redeemable.length} to claim
            </Text>
          </View>
          <Pressable onPress={refresh} hitSlop={12}>
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

        <ScrollView
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {positions.length === 0 ? (
            <EmptyState
              title="No hunches yet"
              body="Swipe your first UP or DOWN on the HUNCH tab. Winning shares show up here to claim."
            />
          ) : (
            positions.map((p) => {
              const youWon =
                p.status === "resolved" &&
                ((p.yesWins && Number(p.yes) > 0) || (!p.yesWins && Number(p.no) > 0));
              const youLost =
                p.status === "resolved" &&
                ((p.yesWins && Number(p.no) > 0 && Number(p.yes) === 0) ||
                  (!p.yesWins && Number(p.yes) > 0 && Number(p.no) === 0));
              const tone = youWon ? "up" : youLost ? "down" : p.status === "open" ? "brand" : "muted";
              const label = youWon
                ? "WON"
                : youLost
                  ? "LOST"
                  : p.status === "open"
                    ? "OPEN"
                    : "RESOLVED";
              const side =
                Number(p.yes) > 0 && Number(p.no) > 0
                  ? `UP ${p.yes} · DOWN ${p.no}`
                  : Number(p.yes) > 0
                    ? `UP ${p.yes}`
                    : `DOWN ${p.no}`;

              return (
                <View
                  key={p.roundId}
                  style={[
                    styles.row,
                    youWon && styles.rowWon,
                    youLost && styles.rowLost,
                  ]}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowTitle}>Round {p.roundId}</Text>
                      <StatusPill label={label} tone={tone} />
                    </View>
                    <Text style={styles.rowMeta}>{side}</Text>
                    {p.redeemable ? (
                      <Text style={styles.claimHint}>Claim {p.estimatedPayout} AUSD</Text>
                    ) : null}
                  </View>
                  {p.redeemable ? (
                    <PrimaryButton
                      label={busyId === p.roundId ? "…" : "Claim"}
                      tone="brand"
                      compact
                      disabled={busyId !== null}
                      onPress={() => onRedeem(p.roundId, p.market)}
                    />
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.lg, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 48,
    letterSpacing: 1,
  },
  sub: { color: colors.muted, fontFamily: type.body, fontSize: 14 },
  refresh: { color: colors.muted, fontFamily: type.medium, fontSize: 13, marginTop: 12 },
  balRow: { flexDirection: "row", gap: 10 },
  balCard: {
    flex: 1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    backgroundColor: colors.bgElevated,
    gap: 4,
  },
  balLabel: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 11,
    letterSpacing: 1,
  },
  balValue: { color: colors.ink, fontFamily: type.bold, fontSize: 20 },
  error: { color: colors.danger, fontFamily: type.body, fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    backgroundColor: colors.bgElevated,
  },
  rowWon: {
    borderColor: "rgba(46,229,157,0.35)",
    backgroundColor: "rgba(46,229,157,0.06)",
  },
  rowLost: {
    borderColor: "rgba(255,77,106,0.28)",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowTitle: { color: colors.ink, fontFamily: type.bold, fontSize: 16 },
  rowMeta: { color: colors.muted, fontFamily: type.body, fontSize: 13 },
  claimHint: { color: colors.brand, fontFamily: type.medium, fontSize: 13 },
});
