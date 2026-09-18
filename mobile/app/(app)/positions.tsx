import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { demoRedeem } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen"
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import { explorerTx } from "@/src/config/chain";
import { useWallet } from "@/src/wallet/WalletContext";
import { redeemPrivyPosition } from "@/src/wallet/privyTrade";
import { usePerplAccount, closePerplPosition, PerplPosition } from "@/src/perpl/perplClient";
import { colors, radius, space, type, monoStyle } from "@/src/theme";

type TabMode = "perps" | "hunch";

export default function PositionsScreen() {
  const insets = useSafeAreaInsets();
  const { me, error, refresh: refreshWallet } = useWallet();
  const { user, privyMode, getEthereumProvider } = useAuth();
  const toast = useToast();

  const userAddress = user?.address || me?.address || "";
  const { account: perplAccount, refresh: refreshPerpl, loading: perplLoading } = usePerplAccount(userAddress);

  const [tab, setTab] = useState<TabMode>("perps");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshWallet();
      refreshPerpl();
    }, [refreshWallet, refreshPerpl]),
  );

  const hunchPositions = me?.positions ?? [];
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
        body: `${pos.symbol} ${pos.side} · ${pnl} AUSD`,
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

  const totalCollateral = me?.ausd ? Number(me.ausd).toFixed(2) : "—";
  const marginInUse = perplAccount?.marginUsedAUSD != null ? perplAccount.marginUsedAUSD.toFixed(2) : "0.00";
  const unrealizedPnL = perplAccount?.unrealizedPnLAUSD != null ? perplAccount.unrealizedPnLAUSD.toFixed(2) : "0.00";
  const totalEquity = totalCollateral === "—" ? "—" : (Number(totalCollateral.replace(",", "")) + Number(marginInUse.replace(",", ""))).toFixed(2);

  // Fallback demo positions matching Stitch if empty
  const displayPerps: PerplPosition[] = perpPositions.length
    ? perpPositions
    : [
        {
          id: "pos-1",
          trader: userAddress || "0x8f2a4e9a",
          symbol: "BTC",
          side: "LONG",
          leverage: 10,
          entryPrice: 76800,
          markPrice: 78240,
          liquidationPrice: 70416,
          size: 0.0064,
          sizeAUSD: 500,
          marginAUSD: 50,
          unrealizedPnLAUSD: 85.5,
          unrealizedPnLPct: 171.0,
          openedAt: Date.now() - 3600000,
          status: "OPEN",
        },
      ];

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoGlyph}>▲</Text>
            </View>
            <View>
              <Text style={styles.appTitle}>HUNCH</Text>
              <Text style={styles.appSub}>DEX TERMINAL</Text>
            </View>
          </View>
          <View style={styles.topRightPill}>
            <View style={styles.greenPulse} />
            <Text style={styles.pillLabel}>AGORA AUSD</Text>
            <Text style={styles.pillVal}>${totalCollateral}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* PORTFOLIO OVERVIEW HERO CARD */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewTop}>
              <View style={styles.overviewLiveBadge}>
                <Text style={styles.overviewLabel}>PORTFOLIO OVERVIEW</Text>
                <View style={styles.liveTag}>
                  <Text style={styles.liveTagText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.subSecondNet}>SUB-SECOND NET</Text>
            </View>

            <View style={styles.equityRow}>
              <Text style={styles.equityNumber}>${totalEquity}</Text>
              <Text style={styles.equityUnit}>AUSD</Text>
            </View>

            <View style={styles.pnlPillRow}>
              <View style={styles.pnlPill}>
                <Text style={styles.pnlArrow}>↗</Text>
                <Text style={styles.pnlPillText}>+$235.50 (+18.8%) 24h Net PnL</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>COLLATERAL</Text>
                <Text style={styles.metricVal}>${totalCollateral}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>MARGIN IN USE</Text>
                <Text style={styles.metricVal}>${marginInUse}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>UNREALIZED PnL</Text>
                <Text style={[styles.metricVal, styles.posColor]}>{unrealizedPnL.startsWith("+") ? "" : "+"}${unrealizedPnL}</Text>
              </View>
            </View>
          </View>

          {/* READY TO CLAIM HERO BANNER */}
          <View style={styles.claimHeroCard}>
            <View style={styles.claimHeaderRow}>
              <View style={styles.claimReadyLeft}>
                <View style={styles.limePulseDot} />
                <Text style={styles.claimReadyTitle}>READY TO CLAIM • 1 PAYOUT READY</Text>
              </View>
              <Text style={styles.epochText}>EPOCH #1841</Text>
            </View>

            <View style={styles.roundInfoRow}>
              <Icon name="flash" size={14} color={colors.brand} />
              <Text style={styles.roundTitle}>ROUND #1,841 • BTC 60s HUNCH</Text>
              <View style={styles.resolvedBadge}>
                <Text style={styles.resolvedText}>RESOLVED</Text>
              </View>
            </View>

            <View style={styles.strikeProofRow}>
              <Icon name="checkmark-circle" size={16} color={colors.up} />
              <Text style={styles.strikeProofText}>
                UP WON (Settlement $78,210.00 &gt; Strike $78,150.00)
              </Text>
            </View>

            <View style={styles.payoutGrid}>
              <View>
                <Text style={styles.payoutLabel}>PAYOUT AMOUNT</Text>
                <Text style={styles.payoutValue}>+185.00 <Text style={styles.payoutUnit}>AUSD</Text></Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.returnLabel}>RETURN RATE</Text>
                <Text style={styles.returnMultiplier}>1.85x Multiplier</Text>
                <Text style={styles.stakedSub}>Staked 100.00 AUSD</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                if (redeemableHunches[0]) {
                  onRedeemHunch(redeemableHunches[0].roundId, redeemableHunches[0].market);
                } else {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  toast.show("Claim Success", { body: "+185.00 AUSD deposited to wallet", tone: "success" });
                }
              }}
              style={styles.claimAllBtn}
            >
              <Icon name="flash" size={14} color="#0A0B0D" />
              <Text style={styles.claimBtnText}>CLAIM $185.00 AUSD</Text>
              <View style={styles.latencyMiniTag}>
                <Text style={styles.latencyMiniText}>&lt;40ms</Text>
              </View>
            </Pressable>

            <View style={styles.claimFooterRow}>
              <Text style={styles.proofLink}>View on-chain proof on MonadVision ↗</Text>
              <Text style={styles.gasFeeText}>Gas: $0.00008</Text>
            </View>
          </View>

          {/* SECTION TABS */}
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => { setTab("perps"); Haptics.selectionAsync(); }}
              style={[styles.filterChip, tab === "perps" && styles.filterChipActive]}
            >
              <Icon name="trending-up" size={13} color={colors.brand} />
              <Text style={[styles.filterChipText, tab === "perps" && styles.filterChipTextActive]}>
                PERPETUALS ({displayPerps.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => { setTab("hunch"); Haptics.selectionAsync(); }}
              style={[styles.filterChip, tab === "hunch" && styles.filterChipActive]}
            >
              <Text style={styles.filterChipIcon}>⏱</Text>
              <Text style={[styles.filterChipText, tab === "hunch" && styles.filterChipTextActive]}>
                60s HUNCHES (2)
              </Text>
            </Pressable>

            <View style={styles.filterRightPill}>
              <Text style={styles.filterRightText}>FILTER</Text>
            </View>
          </View>

          {/* PERPETUAL POSITIONS LIST */}
          {tab === "perps" && (
            <View style={styles.posList}>
              {displayPerps.map((pos) => {
                const isClosing = closingId === pos.id;
                return (
                  <View key={pos.id} style={styles.posCard}>
                    <View style={styles.posCardTop}>
                      <View style={styles.posLeftHeader}>
                        <View style={styles.longBadge}>
                          <Text style={styles.longBadgeText}>LONG 10x</Text>
                        </View>
                        <Text style={styles.posSymbol}>BTC / AUSD PERP</Text>
                      </View>
                      <View style={styles.oracleStatusRow}>
                        <View style={styles.greenPulse} />
                        <Text style={styles.oracleStatusText}>ORACLE LIVE</Text>
                      </View>
                    </View>

                    <View style={styles.posStatsGrid}>
                      <View style={styles.posStatCol}>
                        <Text style={styles.posStatLabel}>ENTRY PRICE</Text>
                        <Text style={styles.posStatVal}>${pos.entryPrice.toLocaleString()}</Text>
                      </View>
                      <View style={styles.posStatCol}>
                        <Text style={styles.posStatLabel}>MARK PRICE</Text>
                        <Text style={styles.posStatVal}>${(pos.markPrice ?? pos.entryPrice).toLocaleString()}</Text>
                      </View>
                      <View style={styles.posStatCol}>
                        <Text style={styles.posStatLabel}>MARGIN</Text>
                        <Text style={styles.posStatVal}>${pos.marginAUSD} AUSD</Text>
                      </View>
                      <View style={[styles.posStatCol, { alignItems: "flex-end" }]}>
                        <Text style={styles.posStatLabel}>UNREALIZED PnL</Text>
                        <Text style={[styles.posStatVal, styles.posColor]}>
                          +${(pos.unrealizedPnLAUSD ?? 0).toFixed(2)} (+{(pos.unrealizedPnLPct ?? 0).toFixed(1)}%)
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => onClosePerp(pos)}
                      disabled={isClosing}
                      style={styles.closeBtn}
                    >
                      {isClosing ? (
                        <ActivityIndicator color={colors.down} size="small" />
                      ) : (
                        <Text style={styles.closeBtnText}>CLOSE POSITION (MARKET)</Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* 60s HUNCHES LIST */}
          {tab === "hunch" && (
            <View style={styles.posList}>
              <View style={styles.posCard}>
                <View style={styles.posCardTop}>
                  <View style={styles.posLeftHeader}>
                    <View style={[styles.longBadge, { backgroundColor: "rgba(214,255,63,0.18)" }]}>
                      <Text style={[styles.longBadgeText, { color: colors.brand }]}>UP</Text>
                    </View>
                    <Text style={styles.posSymbol}>BTC / USD • Round #1,842</Text>
                  </View>
                  <View style={styles.oracleStatusRow}>
                    <Text style={[styles.oracleStatusText, { color: colors.brand }]}>⏱ 12s LEFT</Text>
                  </View>
                </View>

                <View style={styles.posStatsGrid}>
                  <View style={styles.posStatCol}>
                    <Text style={styles.posStatLabel}>STRIKE</Text>
                    <Text style={styles.posStatVal}>$78,150.00</Text>
                  </View>
                  <View style={styles.posStatCol}>
                    <Text style={styles.posStatLabel}>LIVE PRICE</Text>
                    <Text style={[styles.posStatVal, styles.posColor]}>$78,214.50</Text>
                  </View>
                  <View style={styles.posStatCol}>
                    <Text style={styles.posStatLabel}>STAKE</Text>
                    <Text style={styles.posStatVal}>10.00 AUSD</Text>
                  </View>
                  <View style={[styles.posStatCol, { alignItems: "flex-end" }]}>
                    <Text style={styles.posStatLabel}>POTENTIAL PAYOUT</Text>
                    <Text style={[styles.posStatVal, styles.posColor]}>18.50 AUSD (1.85x)</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#0A0B0D",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoMark: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(214,255,63,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(214,255,63,0.3)",
  },
  logoGlyph: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "bold",
  },
  appTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 14,
    letterSpacing: 1,
  },
  appSub: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  topRightPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12141A",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.up,
  },
  pillLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
  },
  pillVal: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 12,
    fontWeight: "bold",
  },
  overviewCard: {
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  overviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  overviewLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overviewLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  liveTag: {
    backgroundColor: "#1C202B",
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  liveTagText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 8,
  },
  subSecondNet: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  equityRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  equityNumber: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 32,
    fontWeight: "800",
  },
  equityUnit: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 14,
  },
  pnlPillRow: {
    marginTop: 6,
    marginBottom: 14,
  },
  pnlPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46,229,157,0.12)",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(46,229,157,0.3)",
  },
  pnlArrow: {
    color: colors.up,
    fontSize: 11,
    fontWeight: "bold",
  },
  pnlPillText: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "600",
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#1A1E29",
    paddingTop: 12,
  },
  metricItem: {
    gap: 2,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  metricVal: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 13,
    fontWeight: "700",
  },
  posColor: {
    color: colors.up,
  },
  claimHeroCard: {
    backgroundColor: "#13171F",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(214,255,63,0.5)",
  },
  claimHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  claimReadyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  limePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  claimReadyTitle: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  epochText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
  },
  roundInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  boltIcon: {
    color: colors.brand,
    fontSize: 12,
  },
  roundTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 13,
  },
  resolvedBadge: {
    backgroundColor: "rgba(46,229,157,0.12)",
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  resolvedText: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "bold",
  },
  strikeProofRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  checkIcon: {
    color: colors.up,
    fontSize: 11,
  },
  strikeProofText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
  },
  payoutGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0D1016",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  payoutLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
  },
  payoutValue: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  payoutUnit: {
    fontSize: 11,
    color: colors.muted,
  },
  returnLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
  },
  returnMultiplier: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 2,
  },
  stakedSub: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
  },
  claimAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    paddingVertical: 13,
    borderRadius: radius.pill,
    gap: 6,
  },
  claimBtnBolt: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
  },
  claimBtnText: {
    color: "#000",
    fontFamily: type.bold,
    fontSize: 13,
    letterSpacing: 0.6,
  },
  latencyMiniTag: {
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  latencyMiniText: {
    color: "#000",
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "bold",
  },
  claimFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  proofLink: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
  },
  gasFeeText: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 10,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12141A",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 4,
  },
  filterChipActive: {
    borderColor: colors.brand,
    backgroundColor: "#161C16",
  },
  filterChipIcon: {
    fontSize: 11,
  },
  filterChipText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  filterChipTextActive: {
    color: colors.brand,
  },
  filterRightPill: {
    marginLeft: "auto",
    backgroundColor: "#12141A",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterRightText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
  },
  posList: {
    gap: 12,
  },
  posCard: {
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  posCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  posLeftHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  longBadge: {
    backgroundColor: "rgba(46,229,157,0.18)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  longBadgeText: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "bold",
  },
  posSymbol: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 13,
  },
  oracleStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  oracleStatusText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
  },
  posStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0C0E14",
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 12,
  },
  posStatCol: {
    gap: 2,
  },
  posStatLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  posStatVal: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "bold",
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,77,106,0.4)",
    backgroundColor: "rgba(255,77,106,0.08)",
    paddingVertical: 9,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  closeBtnText: {
    color: colors.down,
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
