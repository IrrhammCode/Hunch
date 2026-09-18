import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { demoRedeem } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { BalanceChip, EmptyState, PrimaryButton, StatusPill } from "@/src/components/ui";
import { explorerTx } from "@/src/config/chain";
import { useWallet } from "@/src/wallet/WalletContext";
import { redeemPrivyPosition } from "@/src/wallet/privyTrade";
import { usePerplAccount, closePerplPosition, PerplPosition } from "@/src/perpl/perplClient";
import { colors, radius, space, type, monoStyle } from "@/src/theme";

type PortfolioTab = "perps" | "hunch";

export default function PositionsScreen() {
  const insets = useSafeAreaInsets();
  const { me, error, refresh: refreshWallet } = useWallet();
  const { user, privyMode, getEthereumProvider } = useAuth();
  const toast = useToast();

  const userAddress = user?.address || me?.address || "";
  const { account: perplAccount, refresh: refreshPerpl, loading: perplLoading } = usePerplAccount(userAddress);

  const [tab, setTab] = useState<PortfolioTab>("perps");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshWallet();
      refreshPerpl();
    }, [refreshWallet, refreshPerpl]),
  );

  const hunchPositions = me?.positions ?? [];
  const openHunchCount = hunchPositions.filter((p) => p.status === "open").length;
  const redeemableHunches = hunchPositions.filter((p) => p.redeemable);

  const perpPositions = perplAccount?.positions ?? [];

  const onRedeemHunch = async (roundId: string, market: string) => {
    setBusyId(roundId);
    try {
      let txHash = "";
      let payoutLine = "";
      if (privyMode && user?.address) {
        const provider = await getEthereumProvider();
        const r = await redeemPrivyPosition({ provider, address: user.address, market });
        txHash = r.tx;
        payoutLine = "Payout sent to your wallet";
      } else {
        const r = await demoRedeem(roundId);
        txHash = r.tx;
        payoutLine = `+${r.payout} AUSD · ${r.sideWon} won`;
      }
      await refreshWallet();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const onClosePerp = async (pos: PerplPosition) => {
    setClosingId(pos.id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await closePerplPosition(pos.id, userAddress);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const pnl = res.realizedPnL >= 0 ? `+$${res.realizedPnL}` : `-$${Math.abs(res.realizedPnL)}`;
      toast.show("Position Closed", {
        body: `${pos.side} ${pos.symbol} closed · Realized PnL: ${pnl} AUSD`,
        tone: res.realizedPnL >= 0 ? "success" : "neutral",
      });
      refreshPerpl();
      refreshWallet();
    } catch (e: any) {
      toast.error("Failed to close", e.message || String(e));
    } finally {
      setClosingId(null);
    }
  };

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 8 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>PORTFOLIO</Text>
            <Text style={styles.sub}>
              {perpPositions.length} Perps · {redeemableHunches.length} Hunches to claim
            </Text>
          </View>
          <View style={styles.headerRight}>
            <BalanceChip label={me ? `${Number(me.ausd).toFixed(0)} AUSD` : "…"} />
            <Pressable
              onPress={() => {
                refreshWallet();
                refreshPerpl();
              }}
              hitSlop={12}
            >
              <Text style={styles.refresh}>Refresh</Text>
            </Pressable>
          </View>
        </View>

        {/* Portfolio Tabs */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => {
              setTab("perps");
              Haptics.selectionAsync();
            }}
            style={[styles.tabBtn, tab === "perps" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === "perps" && styles.tabTextActive]}>
              📈 PERPETUALS ({perpPositions.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setTab("hunch");
              Haptics.selectionAsync();
            }}
            style={[styles.tabBtn, tab === "hunch" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === "hunch" && styles.tabTextActive]}>
              ⚡ 60s HUNCHES ({hunchPositions.length})
            </Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* PERPS TAB */}
          {tab === "perps" && (
            <>
              {perplAccount && perplAccount.positions.length > 0 && (
                <View style={styles.summaryBar}>
                  <View style={styles.sumCol}>
                    <Text style={styles.sumLabel}>Margin Used</Text>
                    <Text style={styles.sumVal}>${perplAccount.marginUsedAUSD} AUSD</Text>
                  </View>
                  <View style={styles.sumCol}>
                    <Text style={styles.sumLabel}>Unrealized PnL</Text>
                    <Text
                      style={[
                        styles.sumVal,
                        perplAccount.unrealizedPnLAUSD >= 0 ? styles.posText : styles.negText,
                      ]}
                    >
                      {perplAccount.unrealizedPnLAUSD >= 0 ? "+" : ""}
                      ${perplAccount.unrealizedPnLAUSD} AUSD
                    </Text>
                  </View>
                </View>
              )}

              {!perpPositions.length ? (
                <EmptyState
                  glyph="📈"
                  title="No open perpetuals"
                  body="Open a leveraged Long or Short on BTC, ETH, SOL, or MON in Trade."
                />
              ) : (
                perpPositions.map((pos) => {
                  const isClosing = closingId === pos.id;
                  const pnl = pos.unrealizedPnLAUSD ?? 0;
                  const pnlPct = pos.unrealizedPnLPct ?? 0;
                  return (
                    <View key={pos.id} style={styles.posCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.sideBadgeWrap}>
                          <View
                            style={[
                              styles.sideBadge,
                              pos.side === "LONG" ? styles.sideLong : styles.sideShort,
                            ]}
                          >
                            <Text style={styles.sideBadgeText}>{pos.side}</Text>
                          </View>
                          <Text style={styles.symbolText}>{pos.symbol}</Text>
                          <Text style={styles.levText}>{pos.leverage}x</Text>
                        </View>
                        <View style={styles.pnlWrap}>
                          <Text
                            style={[
                              styles.pnlText,
                              pnl >= 0 ? styles.posText : styles.negText,
                            ]}
                          >
                            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                          </Text>
                        </View>
                      </View>

                      <View style={styles.grid}>
                        <View style={styles.gridCol}>
                          <Text style={styles.gridLabel}>Size</Text>
                          <Text style={styles.gridVal}>
                            ${pos.sizeAUSD} ({pos.size} {pos.symbol})
                          </Text>
                        </View>
                        <View style={styles.gridCol}>
                          <Text style={styles.gridLabel}>Entry Price</Text>
                          <Text style={styles.gridVal}>${pos.entryPrice.toLocaleString()}</Text>
                        </View>
                        <View style={styles.gridCol}>
                          <Text style={styles.gridLabel}>Mark Price</Text>
                          <Text style={styles.gridVal}>${pos.markPrice?.toLocaleString() || "—"}</Text>
                        </View>
                        <View style={styles.gridCol}>
                          <Text style={styles.gridLabel}>Liq. Price</Text>
                          <Text style={[styles.gridVal, { color: colors.danger }]}>
                            ${pos.liquidationPrice.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        style={[styles.closeBtn, isClosing && { opacity: 0.6 }]}
                        onPress={() => onClosePerp(pos)}
                        disabled={isClosing}
                      >
                        {isClosing ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.closeBtnText}>CLOSE POSITION (MARKET)</Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })
              )}
            </>
          )}

          {/* 60s HUNCH TAB */}
          {tab === "hunch" && (
            <>
              {!hunchPositions.length ? (
                <EmptyState
                  glyph="⚡"
                  title="No hunch tickets"
                  body="Swipe UP or DOWN on the Trade tab to place a 60-second hunch."
                />
              ) : (
                hunchPositions.map((pos) => {
                  const isBusy = busyId === pos.roundId;
                  return (
                    <View key={pos.roundId} style={styles.posCard}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.symbolText}>ROUND #{pos.roundId}</Text>
                          <Text style={styles.cardSub}>60s Pyth Settlement</Text>
                        </View>
                        <StatusPill
                          label={pos.status === "open" ? "LIVE" : pos.yesWins ? "UP WON" : "DOWN WON"}
                          tone={pos.status === "open" ? "brand" : pos.redeemable ? "up" : "muted"}
                        />
                      </View>

                      <View style={styles.grid}>
                        <View style={styles.gridCol}>
                          <Text style={styles.gridLabel}>UP Shares</Text>
                          <Text style={styles.gridVal}>{pos.yes}</Text>
                        </View>
                        <View style={styles.gridCol}>
                          <Text style={styles.gridLabel}>DOWN Shares</Text>
                          <Text style={styles.gridVal}>{pos.no}</Text>
                        </View>
                        <View style={styles.gridCol}>
                          <Text style={styles.gridLabel}>Est. Payout</Text>
                          <Text style={[styles.gridVal, { color: colors.brand }]}>
                            ${pos.estimatedPayout} AUSD
                          </Text>
                        </View>
                      </View>

                      {pos.redeemable && (
                        <PrimaryButton
                          label={isBusy ? "Claiming…" : `CLAIM $${pos.estimatedPayout} AUSD`}
                          tone="up"
                          disabled={isBusy}
                          onPress={() => onRedeemHunch(pos.roundId, pos.market)}
                        />
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.lg, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerLeft: { gap: 2 },
  headerRight: { alignItems: "flex-end", gap: 8 },
  title: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 44,
    letterSpacing: 1,
  },
  sub: { color: colors.muted, fontFamily: type.body, fontSize: 13 },
  refresh: { color: colors.muted, fontFamily: type.medium, fontSize: 12 },
  error: { color: colors.danger, fontFamily: type.body, fontSize: 13 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: colors.brandDim,
    borderColor: colors.brand,
  },
  tabText: {
    fontFamily: type.bold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: colors.brand,
  },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.bgElevated,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sumCol: { gap: 2 },
  sumLabel: { color: colors.muted, fontFamily: type.body, fontSize: 11 },
  sumVal: { color: colors.ink, fontFamily: type.bold, fontSize: 16 },
  posCard: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.md,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sideBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  sideLong: { backgroundColor: colors.upDim },
  sideShort: { backgroundColor: colors.downDim },
  sideBadgeText: {
    fontFamily: type.bold,
    fontSize: 11,
    color: colors.ink,
  },
  symbolText: {
    fontFamily: type.bold,
    fontSize: 18,
    color: colors.ink,
  },
  levText: {
    fontFamily: type.data,
    fontSize: 12,
    color: colors.muted,
  },
  pnlWrap: { alignItems: "flex-end" },
  pnlText: { fontFamily: type.bold, fontSize: 14 },
  posText: { color: colors.up },
  negText: { color: colors.down },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  gridCol: { width: "50%", gap: 2 },
  gridLabel: { color: colors.muted, fontFamily: type.body, fontSize: 11 },
  gridVal: { color: colors.ink, fontFamily: type.data, fontSize: 13 },
  cardSub: { color: colors.muted, fontFamily: type.body, fontSize: 11 },
  closeBtn: {
    backgroundColor: "rgba(255, 77, 106, 0.18)",
    borderWidth: 1,
    borderColor: colors.down,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: colors.down,
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
