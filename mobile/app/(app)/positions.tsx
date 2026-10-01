import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { haptic as hapticFx } from "@/src/utils/clipboard";
const Haptics = {
  selectionAsync: () => hapticFx("selection"),
  impactAsync: (_style?: unknown) => hapticFx("medium"),
  notificationAsync: (t?: number) => hapticFx(t === 2 ? "error" : t === 1 ? "warning" : "success"),
  ImpactFeedbackStyle: { Medium: "medium", Light: "light" },
  NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
};
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen"
import { EmptyState } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import { explorerTx } from "@/src/config/chain";
import { useWallet } from "@/src/wallet/WalletContext";
import { redeemWalletPosition } from "@/src/wallet/privyTrade";
import {
  usePerplAccount,
  closePerplPosition,
  reversePerplPosition,
  PerplPosition,
} from "@/src/perpl/perplClient";
import { MarginModal } from "@/src/perpl/MarginModal";
import { LiquidationHealthGauge } from "@/src/perpl/LiquidationHealthGauge";
import { PnlShareModal } from "@/src/perpl/PnlShareModal";
import { fetchPerplRisk, type PerplRiskReport } from "@/src/api/client";
import { listHunches, type HunchEntry } from "@/src/hunchBook";
import { colors, radius, space, type, monoStyle } from "@/src/theme";

type TabMode = "perps" | "hunch";

export default function PositionsScreen() {
  const insets = useSafeAreaInsets();
  const { me, error, refresh: refreshWallet } = useWallet();
  const { user, getEthereumProvider } = useAuth();
  const toast = useToast();

  const userAddress = user?.address || me?.address || "";
  const { account: perplAccount, refresh: refreshPerpl, loading: perplLoading } = usePerplAccount(userAddress);

  const [tab, setTab] = useState<TabMode>("perps");
  const [perpSubTab, setPerpSubTab] = useState<"open" | "history">("open");
  const [optimisticClosedIds, setOptimisticClosedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [showMarginModal, setShowMarginModal] = useState(false);
  const [risk, setRisk] = useState<PerplRiskReport | null>(null);
  const [localHunches, setLocalHunches] = useState<HunchEntry[]>([]);
  const [sharePos, setSharePos] = useState<PerplPosition | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshWallet();
      refreshPerpl();
      listHunches().then(setLocalHunches).catch(() => {});
      if (userAddress) {
        fetchPerplRisk(userAddress)
          .then(setRisk)
          .catch(() => setRisk(null));
      }
    }, [refreshWallet, refreshPerpl, userAddress]),
  );

  const hunchPositions = me?.positions ?? [];
  const redeemableHunches = hunchPositions.filter((p) => p.redeemable);
  const perpPositions = perplAccount?.positions ?? [];

  const openPerps = perpPositions.filter(
    (p) => p.status === "OPEN" && !optimisticClosedIds.has(p.id)
  );
  const historyPerps = perpPositions.filter(
    (p) => p.status === "CLOSED" || optimisticClosedIds.has(p.id)
  );
  const displayPerps = perpSubTab === "open" ? openPerps : historyPerps;

  const onRedeemHunch = async (roundId: string, market: string) => {
    setBusyId(roundId);
    try {
      let txHash = "";
      let payoutLine = "";
      if (!user?.address) {
        throw new Error("Sign in with Mera passkey or Privy to claim onchain.");
      }
      const provider = await getEthereumProvider();
      const r = await redeemWalletPosition({ provider, address: user.address, market });
      txHash = r.tx;
      payoutLine = "Payout sent to your wallet";
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
    setOptimisticClosedIds((prev) => new Set(prev).add(pos.id));
    setClosingId(pos.id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const traderAddr = userAddress || pos.trader;
      const res = await closePerplPosition(pos.id, traderAddr, {
        symbol: pos.symbol,
        side: pos.side,
        size: pos.size,
        leverage: pos.leverage,
        entryPrice: pos.entryPrice,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const pnlNum = res.realizedPnL ?? 0;
      const pnlStr = pnlNum >= 0 ? `+$${pnlNum.toFixed(2)}` : `-$${Math.abs(pnlNum).toFixed(2)}`;
      toast.show("Position Closed", {
        body: `${pos.symbol} ${pos.side} · ${pnlStr} AUSD realized PnL`,
        tone: pnlNum >= 0 ? "success" : "neutral",
      });

      await refreshPerpl();
      await refreshWallet();
    } catch (e: any) {
      setOptimisticClosedIds((prev) => {
        const next = new Set(prev);
        next.delete(pos.id);
        return next;
      });
      toast.error("Failed to close", e.message || String(e));
    } finally {
      setClosingId(null);
    }
  };

  const onReversePerp = async (pos: PerplPosition) => {
    const nextSide = pos.side === "LONG" ? "SHORT" : "LONG";
    setReversingId(pos.id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const traderAddr = userAddress || pos.trader;
      const res = await reversePerplPosition(pos.id, traderAddr, {
        symbol: pos.symbol,
        side: pos.side,
        size: pos.size,
        leverage: pos.leverage,
        entryPrice: pos.entryPrice,
        marginAUSD: pos.marginAUSD,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const pnlNum = res.realizedPnL ?? 0;
      const pnlStr = pnlNum >= 0 ? `+$${pnlNum.toFixed(2)}` : `-$${Math.abs(pnlNum).toFixed(2)}`;
      toast.show("Position Reversed", {
        body: `Flipped to ${nextSide} ${pos.symbol} (${pnlStr} closed)`,
        tone: "success",
      });

      await refreshPerpl();
      await refreshWallet();
    } catch (e: any) {
      toast.error("Failed to reverse", e.message || String(e));
    } finally {
      setReversingId(null);
    }
  };

  const totalCollateral = me?.ausd ? Number(me.ausd).toFixed(2) : "—";
  const openMargin = openPerps.reduce((s, p) => s + (p.marginAUSD || 0), 0);
  const openPnL = openPerps.reduce((s, p) => s + (p.unrealizedPnLAUSD || 0), 0);
  const marginInUse = openMargin.toFixed(2);
  const unrealizedPnL = openPnL.toFixed(2);
  const totalEquity =
    totalCollateral === "—"
      ? "—"
      : (
          Number(totalCollateral.replace(",", "")) +
          openMargin +
          openPnL
        ).toFixed(2);

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
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
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowMarginModal(true);
            }}
            style={styles.topRightPill}
          >
            <View style={styles.greenPulse} />
            <Text style={styles.pillLabel}>AUSD TESTNET</Text>
            <Text style={styles.pillVal}>${totalCollateral}</Text>
            <Text style={{ color: colors.brand, fontSize: 13, fontWeight: "700", marginLeft: 4 }}>+</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1, width: "100%", alignSelf: "stretch" }}
          contentContainerStyle={{
            width: "100%",
            alignItems: "stretch",
            gap: 12,
            paddingBottom: 36,
          }}
          showsVerticalScrollIndicator={false}
        >
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
                <Text style={styles.pnlPillText}>
                  {unrealizedPnL !== "0.00"
                    ? `${unrealizedPnL.startsWith("-") ? "" : "+"}$${unrealizedPnL} open PnL`
                    : "No open Perpl PnL"}
                </Text>
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
                <Text style={[styles.metricVal, styles.posColor]}>
                  {unrealizedPnL.startsWith("-") ? "" : "+"}${unrealizedPnL}
                </Text>
              </View>
            </View>

            {/* MARGIN MANAGEMENT ROW */}
            <View style={styles.marginActionRow}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowMarginModal(true);
                }}
                style={({ pressed }) => [styles.depositMarginBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.depositMarginGlyph}>+</Text>
                <Text style={styles.depositMarginText}>DEPOSIT AGORA AUSD</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowMarginModal(true);
                }}
                style={({ pressed }) => [styles.withdrawMarginBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.withdrawMarginText}>WITHDRAW</Text>
              </Pressable>
            </View>
          </View>

          {/* LIQUIDATION HEALTH GAUGE & ANALYTICS — bounty surface */}
          <LiquidationHealthGauge
            risk={risk}
            onDepositPress={() => setShowMarginModal(true)}
          />

          {/* REAL REDEEMABLE HUNCH ONLY — no hardcoded payouts */}
          {redeemableHunches.length > 0 ? (
            <View style={styles.claimHeroCard}>
              <View style={styles.claimHeaderRow}>
                <View style={styles.claimReadyLeft}>
                  <View style={styles.limePulseDot} />
                  <Text style={styles.claimReadyTitle}>
                    READY TO CLAIM • {redeemableHunches.length} PAYOUT
                    {redeemableHunches.length > 1 ? "S" : ""} READY
                  </Text>
                </View>
                <Text style={styles.epochText}>ONCHAIN</Text>
              </View>

              {redeemableHunches.slice(0, 3).map((h) => (
                <View key={h.roundId} style={styles.roundInfoRow}>
                  <Icon name="flash" size={14} color={colors.brand} />
                  <Text style={styles.roundTitle}>
                    ROUND #{h.roundId} · {h.yesWins ? "UP WON" : "DOWN WON"}
                  </Text>
                  <View style={styles.resolvedBadge}>
                    <Text style={styles.resolvedText}>RESOLVED</Text>
                  </View>
                </View>
              ))}

              <View style={styles.payoutGrid}>
                <View>
                  <Text style={styles.payoutLabel}>PAYOUT AMOUNT</Text>
                  <Text style={styles.payoutValue}>
                    +{redeemableHunches
                      .reduce((s, h) => s + Number(h.estimatedPayout || 0), 0)
                      .toFixed(2)}{" "}
                    <Text style={styles.payoutUnit}>AUSD</Text>
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  const first = redeemableHunches[0];
                  if (first) onRedeemHunch(first.roundId, first.market);
                }}
                style={styles.claimAllBtn}
                disabled={busyId !== null}
              >
                <Icon name="flash" size={14} color="#0A0B0D" />
                <Text style={styles.claimAllBtnText}>
                  CLAIM $
                  {redeemableHunches
                    .reduce((s, h) => s + Number(h.estimatedPayout || 0), 0)
                    .toFixed(2)}{" "}
                  AUSD
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* SECTION TABS */}
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => { setTab("perps"); Haptics.selectionAsync(); }}
              style={[styles.filterChip, tab === "perps" && styles.filterChipActive]}
            >
              <Icon name="trending-up" size={13} color={colors.brand} />
              <Text style={[styles.filterChipText, tab === "perps" && styles.filterChipTextActive]}>
                PERPETUALS ({openPerps.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => { setTab("hunch"); Haptics.selectionAsync(); }}
              style={[styles.filterChip, tab === "hunch" && styles.filterChipActive]}
            >
              <Icon name="time-outline" size={13} color={colors.brand} />
              <Text style={[styles.filterChipText, tab === "hunch" && styles.filterChipTextActive]}>
                60s HUNCHES ({hunchPositions.length})
              </Text>
            </Pressable>
          </View>

          {/* PERP SUB-TABS: OPEN vs HISTORY */}
          {tab === "perps" && (
            <View style={styles.subFilterRow}>
              <Pressable
                onPress={() => { setPerpSubTab("open"); Haptics.selectionAsync(); }}
                style={[styles.subFilterBtn, perpSubTab === "open" && styles.subFilterBtnActive]}
              >
                <Text style={[styles.subFilterText, perpSubTab === "open" && styles.subFilterTextActive]}>
                  OPEN ({openPerps.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setPerpSubTab("history"); Haptics.selectionAsync(); }}
                style={[styles.subFilterBtn, perpSubTab === "history" && styles.subFilterBtnActive]}
              >
                <Text style={[styles.subFilterText, perpSubTab === "history" && styles.subFilterTextActive]}>
                  HISTORY ({historyPerps.length})
                </Text>
              </Pressable>
            </View>
          )}

          {/* PERPETUAL POSITIONS LIST — live Perpl data only */}
          {tab === "perps" && (
            <View style={styles.posList}>
              {displayPerps.length === 0 ? (
                <EmptyState
                  icon="trending-up"
                  title={perpSubTab === "open" ? "No open Perpl positions" : "No position history"}
                  body={
                    perpSubTab === "open"
                      ? "Open TRADE → pick BTC/ETH/PUMP → LONG or SHORT to open a live perp."
                      : "Closed positions and realized PnL will be listed here."
                  }
                />
              ) : null}
              {displayPerps.map((pos) => {
                const isClosing = closingId === pos.id;
                const isClosed = pos.status === "CLOSED" || optimisticClosedIds.has(pos.id);

                return (
                  <View key={pos.id} style={styles.posCard}>
                    <View style={styles.posCardTop}>
                      <View style={styles.posLeftHeader}>
                        <View style={pos.side === "LONG" ? styles.longBadge : styles.shortBadge}>
                          <Text style={pos.side === "LONG" ? styles.longBadgeText : styles.shortBadgeText}>
                            {pos.side} {pos.leverage}x
                          </Text>
                        </View>
                        <Text style={styles.posSymbol}>{pos.symbol} / AUSD PERP</Text>
                      </View>
                      <View style={styles.oracleStatusRow}>
                        {isClosed ? (
                          <View style={styles.closedBadge}>
                            <Text style={styles.closedBadgeText}>CLOSED</Text>
                          </View>
                        ) : (
                          <>
                            <View style={styles.greenPulse} />
                            <Text style={styles.oracleStatusText}>PERPL LIVE</Text>
                          </>
                        )}
                      </View>
                    </View>

                    {pos.id.startsWith("hedge_") && (
                      <View style={styles.hedgePillRow}>
                        <View style={styles.hedgePill}>
                          <Text style={styles.hedgePillText}>
                            PROTECTIVE HEDGE FOR 60s HUNCH
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.posStatsGrid}>
                      <View style={styles.posStatCol}>
                        <Text style={styles.posStatLabel}>ENTRY PRICE</Text>
                        <Text style={styles.posStatVal}>${pos.entryPrice.toLocaleString()}</Text>
                      </View>
                      <View style={styles.posStatCol}>
                        <Text style={styles.posStatLabel}>{isClosed ? "CLOSED PRICE" : "MARK PRICE"}</Text>
                        <Text style={styles.posStatVal}>
                          ${(isClosed ? (pos.closedPrice ?? pos.markPrice ?? pos.entryPrice) : (pos.markPrice ?? pos.entryPrice)).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.posStatCol}>
                        <Text style={styles.posStatLabel}>MARGIN</Text>
                        <Text style={styles.posStatVal}>${pos.marginAUSD} AUSD</Text>
                      </View>
                      <View style={[styles.posStatCol, { alignItems: "flex-end" }]}>
                        <Text style={styles.posStatLabel}>{isClosed ? "REALIZED PnL" : "UNREALIZED PnL"}</Text>
                        {isClosed ? (
                          <Text
                            style={[
                              styles.posStatVal,
                              (pos.realizedPnLAUSD ?? 0) >= 0 ? styles.posColor : styles.negColor,
                            ]}
                          >
                            {(pos.realizedPnLAUSD ?? 0) >= 0 ? "+" : ""}${(pos.realizedPnLAUSD ?? 0).toFixed(2)}
                          </Text>
                        ) : (
                          <Text style={[styles.posStatVal, (pos.unrealizedPnLAUSD ?? 0) >= 0 ? styles.posColor : styles.negColor]}>
                            {(pos.unrealizedPnLAUSD ?? 0) >= 0 ? "+" : ""}${(pos.unrealizedPnLAUSD ?? 0).toFixed(2)} ({(pos.unrealizedPnLPct ?? 0).toFixed(1)}%)
                          </Text>
                        )}
                      </View>
                    </View>

                    {(pos.tpPrice != null || pos.slPrice != null || (pos.closeReason && pos.closeReason !== "USER")) && (
                      <View style={styles.posGuardsRow}>
                        {pos.tpPrice != null && (
                          <View style={styles.posGuardBadgeTP}>
                            <Text style={styles.posGuardBadgeTPText}>
                              TP ${pos.tpPrice.toLocaleString()}
                            </Text>
                          </View>
                        )}
                        {pos.slPrice != null && (
                          <View style={styles.posGuardBadgeSL}>
                            <Text style={styles.posGuardBadgeSLText}>
                              SL ${pos.slPrice.toLocaleString()}
                            </Text>
                          </View>
                        )}
                        {pos.closeReason && pos.closeReason !== "USER" && (
                          <View style={styles.posReasonBadge}>
                            <Text style={styles.posReasonBadgeText}>
                              {pos.closeReason === "TP_TRIGGERED"
                                ? "TP HIT"
                                : pos.closeReason === "SL_TRIGGERED"
                                ? "SL HIT"
                                : pos.closeReason}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={styles.actionRow}>
                      {!isClosed && (
                        <>
                          <Pressable
                            onPress={() => onReversePerp(pos)}
                            disabled={isClosing || reversingId === pos.id}
                            style={[styles.actionBtn, styles.reverseBtn]}
                          >
                            {reversingId === pos.id ? (
                              <ActivityIndicator color="#D6FF3F" size="small" />
                            ) : (
                              <Text style={styles.reverseBtnText}>REVERSE</Text>
                            )}
                          </Pressable>

                          <Pressable
                            onPress={() => onClosePerp(pos)}
                            disabled={isClosing || reversingId === pos.id}
                            style={[styles.actionBtn, styles.closeBtn]}
                          >
                            {isClosing ? (
                              <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                              <Text style={styles.closeBtnText}>CLOSE</Text>
                            )}
                          </Pressable>
                        </>
                      )}

                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSharePos(pos);
                        }}
                        style={[styles.actionBtn, styles.shareBtn, isClosed && { flex: 1 }]}
                      >
                        <Text style={styles.shareBtnText}>SHARE</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* 60s HUNCHES LIST — onchain wallet positions only */}
          {tab === "hunch" && (
            <View style={styles.posList}>
              {hunchPositions.length === 0 ? (
                <EmptyState
                  icon="time-outline"
                  title="No hunch positions"
                  body="Swipe UP/DOWN on TRADE tab to open a 60s market."
                />
              ) : null}
              {hunchPositions.map((h) => {
                const localH = localHunches.find((lh) => lh.roundId === h.roundId);
                return (
                  <View key={h.roundId} style={styles.posCard}>
                    <View style={styles.posCardTop}>
                      <View style={styles.posLeftHeader}>
                        <View style={[styles.longBadge, { backgroundColor: "rgba(214,255,63,0.18)" }]}>
                          <Text style={[styles.longBadgeText, { color: colors.brand }]}>
                            {Number(h.yes) > 0 ? "UP" : "DOWN"}
                          </Text>
                        </View>
                        <Text style={styles.posSymbol}>ROUND #{h.roundId}</Text>
                      </View>
                      <View style={styles.oracleStatusRow}>
                        <Text style={[styles.oracleStatusText, { color: colors.brand }]}>
                          {h.status === "open" ? "OPEN" : "RESOLVED"}
                        </Text>
                      </View>
                    </View>

                    {localH?.hedgedPerpId && (
                      <View style={styles.hedgePillRow}>
                        <View style={styles.hedgePill}>
                          <Text style={styles.hedgePillText}>
                            DELTA-HEDGED WITH PERPL ({localH.hedgeSide || "PERP"})
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.posStatsGrid}>
                    <View style={styles.posStatCol}>
                      <Text style={styles.posStatLabel}>YES SHARES</Text>
                      <Text style={styles.posStatVal}>{h.yes}</Text>
                    </View>
                    <View style={styles.posStatCol}>
                      <Text style={styles.posStatLabel}>NO SHARES</Text>
                      <Text style={styles.posStatVal}>{h.no}</Text>
                    </View>
                    <View style={styles.posStatCol}>
                      <Text style={styles.posStatLabel}>EST. PAYOUT</Text>
                      <Text style={styles.posStatVal}>{h.estimatedPayout} AUSD</Text>
                    </View>
                    <View style={[styles.posStatCol, { alignItems: "flex-end" }]}>
                      <Text style={styles.posStatLabel}>REDEEMABLE</Text>
                      <Text style={[styles.posStatVal, h.redeemable ? styles.posColor : undefined]}>
                        {h.redeemable ? "YES" : "NO"}
                      </Text>
                    </View>
                  </View>

                  {h.redeemable ? (
                    <Pressable
                      onPress={() => onRedeemHunch(h.roundId, h.market)}
                      disabled={busyId === h.roundId}
                      style={styles.claimBtn}
                    >
                      {busyId === h.roundId ? (
                        <ActivityIndicator color="#D6FF3F" size="small" />
                      ) : (
                        <Text style={styles.claimBtnText}>CLAIM ONCHAIN</Text>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
        </ScrollView>
      </View>
      <MarginModal
        visible={showMarginModal}
        onClose={() => setShowMarginModal(false)}
        walletAddress={userAddress}
        walletAUSD={totalCollateral !== "—" ? totalCollateral : "0.00"}
        perplMarginAUSD={perplAccount?.onchainCollateralAUSD || (risk?.freeMarginAUSD != null ? risk.freeMarginAUSD.toFixed(2) : "0.00")}
        getEthereumProvider={getEthereumProvider}
        onSuccess={() => {
          refreshPerpl();
          refreshWallet();
          if (userAddress) {
            fetchPerplRisk(userAddress).then(setRisk).catch(() => {});
          }
        }}
      />
      <PnlShareModal
        visible={sharePos !== null}
        onClose={() => setSharePos(null)}
        position={sharePos}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    paddingHorizontal: 14,
    backgroundColor: "#0A0B0D",
    paddingBottom: 0,
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
  negColor: {
    color: colors.down,
  },
  marginActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1A1E29",
  },
  depositMarginBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(214,255,63,0.12)",
    borderWidth: 1,
    borderColor: "rgba(214,255,63,0.35)",
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  depositMarginGlyph: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 14,
    lineHeight: 16,
  },
  depositMarginText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  withdrawMarginBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161A23",
    borderWidth: 1,
    borderColor: "#222735",
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  withdrawMarginText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 0.8,
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
  claimAllBtnText: {
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
  subFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  subFilterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: "#12141A",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  subFilterBtnActive: {
    backgroundColor: "#182012",
    borderColor: colors.brand,
  },
  subFilterText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  subFilterTextActive: {
    color: colors.brand,
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
  shortBadge: {
    backgroundColor: "rgba(255,77,106,0.18)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  shortBadgeText: {
    color: colors.down,
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "bold",
  },
  closedBadge: {
    backgroundColor: "#1F2330",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#2B3245",
  },
  closedBadgeText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
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
  hedgePillRow: {
    marginBottom: 8,
  },
  hedgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(214,255,63,0.1)",
    borderWidth: 1,
    borderColor: "rgba(214,255,63,0.3)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  hedgePillIcon: {
    fontSize: 10,
  },
  hedgePillText: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "bold",
  },
  posGuardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  posGuardBadgeTP: {
    backgroundColor: "rgba(46,229,157,0.12)",
    borderWidth: 1,
    borderColor: "rgba(46,229,157,0.35)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  posGuardBadgeTPText: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "bold",
  },
  posGuardBadgeSL: {
    backgroundColor: "rgba(255,77,106,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,77,106,0.35)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  posGuardBadgeSLText: {
    color: colors.down,
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "bold",
  },
  posReasonBadge: {
    backgroundColor: "#1F2533",
    borderWidth: 1,
    borderColor: "#2B3245",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  posReasonBadgeText: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  reverseBtn: {
    borderColor: "#D6FF3F",
    backgroundColor: "#182012",
  },
  reverseBtnText: {
    color: "#D6FF3F",
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  closeBtn: {
    flex: 1.2,
    borderWidth: 1.5,
    borderColor: "#FF4D6A",
    backgroundColor: "#2B0F16",
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: "#FFFFFF",
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  shareBtn: {
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    backgroundColor: "#141C2B",
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnText: {
    color: "#60A5FA",
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  claimBtn: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "#D6FF3F",
    backgroundColor: "#182012",
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  claimBtnText: {
    color: "#D6FF3F",
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
});
