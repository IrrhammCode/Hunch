import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { demoRedeem, fetchCrossChainBook } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { BalanceChip, EmptyState, PrimaryButton, StatusPill } from "@/src/components/ui";
import { explorerTx } from "@/src/config/chain";
import { useWallet } from "@/src/wallet/WalletContext";
import { redeemPrivyPosition } from "@/src/wallet/privyTrade";
import { colors, radius, space, type } from "@/src/theme";

export default function PositionsScreen() {
  const insets = useSafeAreaInsets();
  const { me, error, refresh } = useWallet();
  const { user, privyMode, getEthereumProvider } = useAuth();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastClaim, setLastClaim] = useState<{ roundId: string; tx: string } | null>(null);
  const [bookNote, setBookNote] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      (async () => {
        if (privyMode && user?.address) {
          try {
            const book = await fetchCrossChainBook(user.address);
            const lines = book.chains
              .map((c) => `${c.chain.toUpperCase()} ${c.available === false ? "off" : `AUSD ${c.ausd ?? "—"}`}`)
              .join(" · ");
            setBookNote(lines || null);
          } catch {
            setBookNote(null);
          }
        }
      })();
    }, [refresh, privyMode, user?.address]),
  );

  const positions = me?.positions ?? [];
  const openCount = positions.filter((p) => p.status === "open").length;
  const redeemable = positions.filter((p) => p.redeemable);

  const onRedeem = async (roundId: string, market: string) => {
    setBusyId(roundId);
    try {
      let txHash = "";
      let payoutLine = "";
      if (privyMode && user?.address) {
        const provider = await getEthereumProvider();
        const r = await redeemPrivyPosition({ provider, address: user.address, market });
        txHash = r.tx;
        payoutLine = "Payout sent";
      } else {
        const r = await demoRedeem(roundId);
        txHash = r.tx;
        payoutLine = `+${r.payout} AUSD · ${r.sideWon} won`;
      }
      await refresh();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastClaim({ roundId, tx: txHash });
      toast.show("Claimed", {
        body: payoutLine,
        tone: "success",
        actionLabel: "View tx",
        onAction: () => {
          Linking.openURL(explorerTx(txHash)).catch(() => {});
        },
      });
    } catch (e) {
      toast.error("Claim failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>PORTFOLIO</Text>
            <Text style={styles.sub}>
              {openCount} open · {redeemable.length} to claim
            </Text>
            {bookNote ? <Text style={styles.bookNote}>{bookNote}</Text> : null}
          </View>
          <View style={styles.headerRight}>
            <BalanceChip label={me ? `${Number(me.ausd).toFixed(0)} AUSD` : "…"} />
            <Pressable onPress={refresh} hitSlop={12}>
              <Text style={styles.refresh}>Refresh</Text>
            </Pressable>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ScrollView
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {positions.length === 0 ? (
            <EmptyState
              glyph="↑ UP   ↓ DOWN"
              title="No hunches yet"
              body="Swipe your first one on the HUNCH tab. Winning shares show up here to claim."
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
                  style={[styles.row, youWon && styles.rowWon, youLost && styles.rowLost]}
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
                    {lastClaim?.roundId === p.roundId ? (
                      <Pressable
                        onPress={() => {
                          Linking.openURL(explorerTx(lastClaim.tx)).catch(() => {});
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.explorerLink}>View on MonadVision →</Text>
                      </Pressable>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: "flex-end", gap: 8, marginTop: 10 },
  title: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 48,
    letterSpacing: 1,
  },
  sub: { color: colors.muted, fontFamily: type.body, fontSize: 14 },
  bookNote: { color: colors.brand, fontFamily: type.medium, fontSize: 12, marginTop: 4 },
  refresh: { color: colors.muted, fontFamily: type.medium, fontSize: 13 },
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
    borderColor: "rgba(46,229,157,0.4)",
    backgroundColor: "rgba(46,229,157,0.07)",
  },
  rowLost: {
    borderColor: "rgba(255,77,106,0.32)",
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
  explorerLink: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
