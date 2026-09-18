import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  demoTrade,
  fetchCurrentRound,
  fetchQuote,
  fetchRound,
  type CurrentRoundResponse,
} from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { BrandMark } from "@/src/components/BrandMark";
import { Screen } from "@/src/components/Screen";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import { AmountChip, BalanceChip, PrimaryButton } from "@/src/components/ui";
import { explorerTx } from "@/src/config/chain";
import { getSelectedMarket } from "@/src/market/selection";
import { addHunch, listHunches, settleRound } from "@/src/hunchBook";
import { useWallet } from "@/src/wallet/WalletContext";
import { placePrivyTrade } from "@/src/wallet/privyTrade";
import { PerpTradingTicket } from "@/src/perpl/PerpTradingTicket";
import { colors, radius, space, type } from "@/src/theme";

const AMOUNTS = ["5", "10", "25"] as const;
const { width: SCREEN_W } = Dimensions.get("window");
const SWIPE_X = SCREEN_W * 0.26;

function formatStrike(raw: string, expo: number) {
  const n = Number(raw) * Math.pow(10, expo);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatCountdown(sec: number) {
  if (sec <= 0) return "00.0";
  if (sec >= 10) return String(Math.ceil(sec)).padStart(2, "0");
  return sec.toFixed(1);
}

export default function HunchScreen() {
  const insets = useSafeAreaInsets();
  const { me, refresh: refreshWallet } = useWallet();
  const { user, privyMode, getEthereumProvider } = useAuth();
  const toast = useToast();
  const [tradeMode, setTradeMode] = useState<"perps" | "hunch">("perps");
  const [data, setData] = useState<CurrentRoundResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<"UP" | "DOWN" | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [amount, setAmount] = useState<string>("10");
  const [quoteLine, setQuoteLine] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const settledRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  const tx = useSharedValue(0);
  const pulse = useSharedValue(0);

  const refresh = useCallback(async () => {
    try {
      const sel = getSelectedMarket();
      const next = await fetchCurrentRound(sel.symbol);
      setData(next);
      setErr(null);

      if (next.round?.status === "open" && typeof next.timeRemaining === "number") {
        setEndsAt(Date.now() + next.timeRemaining * 1000);
      } else if (next.round?.status !== "open") {
        setEndsAt(null);
      }

      const openHunches = (await listHunches()).filter((h) => h.status === "open");
      const ids = [...new Set(openHunches.map((h) => h.roundId))];
      for (const rid of ids) {
        if (settledRef.current.has(rid)) continue;
        try {
          const detail = await fetchRound(rid);
          if (detail.round?.status === "resolved" && typeof detail.round.yesWins === "boolean") {
            const settled = await settleRound(rid, detail.round.yesWins);
            settledRef.current.add(rid);
            if (settled.length) {
              const won = settled.every((h) => h.status === "won");
              await Haptics.notificationAsync(
                won ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
              );
              const outcome = detail.round.yesWins ? "BTC finished UP" : "BTC finished DOWN";
              const line = settled.map((h) => `${h.side} → ${h.status.toUpperCase()}`).join("\n");
              setLastResult(line);
              setFlash(won ? "up" : "down");
              setTimeout(() => setFlash(null), 700);
              if (won) toast.success("You won", `${outcome}\n${line}`);
              else toast.error("You lost", `${outcome}\n${line}`);
            }
          }
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "API offline";
      setErr(`${msg}`);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 6000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // Countdown pulse under 10s
  const remainingSecRaw =
    data?.round?.status === "open" && endsAt != null
      ? Math.max(0, (endsAt - nowMs) / 1000)
      : 0;
  const urgent = remainingSecRaw > 0 && remainingSecRaw < 10;

  useEffect(() => {
    if (!urgent) {
      pulse.value = 0;
      return;
    }
    pulse.value = withSequence(
      withTiming(1, { duration: 420 }),
      withTiming(0, { duration: 420 }),
    );
    const id = setInterval(() => {
      pulse.value = withSequence(
        withTiming(1, { duration: 420 }),
        withTiming(0, { duration: 420 }),
      );
    }, 840);
    return () => clearInterval(id);
  }, [urgent, pulse]);

  const round = data?.round;
  const open = round?.status === "open";
  const remainingSec = remainingSecRaw;
  const remainingDisplay = open ? formatCountdown(remainingSec) : "—";
  const strikeLabel = round ? formatStrike(round.strike, round.expo) : "—";
  const canTrade = open && remainingSec >= 12 && !busy;

  useEffect(() => {
    if (!open || !round?.market) {
      setQuoteLine(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [up, down] = await Promise.all([
          fetchQuote("YES", amount, round.market),
          fetchQuote("NO", amount, round.market),
        ]);
        if (cancelled) return;
        setQuoteLine(
          `~${Number(up.sharesOut).toFixed(1)} UP · ~${Number(down.sharesOut).toFixed(1)} DOWN shares`,
        );
      } catch {
        if (!cancelled) setQuoteLine(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, round?.market, round?.roundId, amount, data?.spot?.yes]);

  const onPick = useCallback(
    async (side: "UP" | "DOWN") => {
      if (busyRef.current) return;
      if (err) {
        toast.error("API offline", "Cannot reach the Hunch API.");
        return;
      }
      if (!open || !round) {
        toast.show("No live round", { body: "Keeper is opening the next market." });
        return;
      }
      if (remainingSec < 12) {
        toast.show("Too late", { body: "Under 12s left — wait for next round." });
        return;
      }
      if (privyMode && !user?.address) {
        toast.error("Wallet not ready", "Finish email OTP so your wallet can trade.");
        return;
      }

      busyRef.current = true;
      setBusy(true);
      setPicked(side);
      setFlash(side === "UP" ? "up" : "down");
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        let roundId: string;
        let yes: string;
        let no: string;
        let hash: string;

        if (privyMode && user?.address) {
          const provider = await getEthereumProvider();
          const result = await placePrivyTrade({
            provider,
            address: user.address,
            side,
            amountAUSD: amount,
            symbol: getSelectedMarket().symbol,
            market: getSelectedMarket().market || undefined,
          });
          roundId = result.roundId;
          yes = result.yes;
          no = result.no;
          hash = result.executeTx;
          setLastResult(
            `${getSelectedMarket().symbol} ${side} · R${roundId}${result.funded ? " · funded" : ""}`,
          );
        } else {
          const result = await demoTrade(side, amount, getSelectedMarket().symbol);
          roundId = result.roundId;
          yes = result.yes;
          no = result.no;
          hash = result.executeTx;
          setLastResult(`${getSelectedMarket().symbol} ${side} · R${roundId}`);
        }

        await addHunch({
          roundId,
          side,
          amountAUSD: amount,
          yes,
          no,
          tx: hash,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.show(`${side} filled`, {
          body: `${amount} AUSD · round ${roundId}`,
          tone: "success",
          actionLabel: "View tx",
          onAction: () => {
            Linking.openURL(explorerTx(hash)).catch(() => {});
          },
        });
        await Promise.all([refresh(), refreshWallet()]);
      } catch (e) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.error("Trade failed", e instanceof Error ? e.message : String(e));
      } finally {
        busyRef.current = false;
        setBusy(false);
        setTimeout(() => setFlash(null), 500);
        tx.value = withSpring(0);
      }
    },
    [
      err,
      open,
      round,
      remainingSec,
      amount,
      refresh,
      refreshWallet,
      tx,
      privyMode,
      user?.address,
      getEthereumProvider,
      toast,
    ],
  );

  const pan = Gesture.Pan()
    .enabled(canTrade)
    .onUpdate((e) => {
      tx.value = Math.max(-150, Math.min(150, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_X) {
        tx.value = withSpring(240);
        runOnJS(onPick)("UP");
      } else if (e.translationX < -SWIPE_X) {
        tx.value = withSpring(-240);
        runOnJS(onPick)("DOWN");
      } else {
        tx.value = withSpring(0);
        runOnJS(Haptics.selectionAsync)();
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { rotate: `${interpolate(tx.value, [-150, 0, 150], [-7, 0, 7])}deg` },
      { scale: interpolate(Math.abs(tx.value), [0, 80], [1, 1.02], {
        extrapolateRight: "clamp",
      }) },
    ],
    borderColor: interpolateColor(
      tx.value,
      [-100, 0, 100],
      [colors.down, colors.lineStrong, colors.up],
    ),
    shadowColor: interpolateColor(
      tx.value,
      [-100, 0, 100],
      [colors.down, "#00000000", colors.up],
    ),
  }));

  const upHint = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [20, 90], [0.2, 1]),
    transform: [{ translateX: interpolate(tx.value, [0, 150], [0, 8]) }],
  }));
  const downHint = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-90, -20], [1, 0.2]),
    transform: [{ translateX: interpolate(tx.value, [-150, 0], [-8, 0]) }],
  }));

  const countdownStyle = useAnimatedStyle(() => ({
    opacity: urgent ? 0.72 + pulse.value * 0.28 : 1,
    transform: [{ scale: urgent ? 1 + pulse.value * 0.03 : 1 }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash ? 0.16 : 0,
    backgroundColor: flash === "down" ? colors.down : flash === "up" ? colors.up : colors.brand,
  }));

  const note = busy
    ? `Sending ${picked} · ${amount} AUSD…`
    : !open
      ? err || "Waiting for the next 60s round."
      : remainingSec < 12
        ? "Entry closed · next round soon"
        : canTrade
          ? `Swipe to commit ${amount} AUSD`
          : "Loading market…";

  return (
    <Screen>
      <View
        style={[
          styles.wrap,
          { paddingTop: insets.top + 10, paddingBottom: 0 },
        ]}
      >
        {/* Top bar matching Stitch */}
        <View style={styles.top}>
          <View style={styles.topBrandWrap}>
            <BrandMark size="sm" />
            <View style={styles.networkPulseWrap}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.topNetworkText}>MONAD TESTNET</Text>
            </View>
          </View>
          <View style={styles.topBalancePill}>
            <Text style={styles.ausdBadge}>A</Text>
            <Text style={styles.balanceNum}>
              {me?.ausd != null ? Number(me.ausd).toFixed(2) : "—"}
            </Text>
            <Text style={styles.balanceUnit}>AUSD</Text>
            <Text style={styles.plusIcon}>+</Text>
          </View>
        </View>

        {/* Trade Mode Segmenter */}
        <View style={styles.modeSegment}>
          <View style={styles.modeInner}>
            <Pressable
              onPress={() => {
                setTradeMode("perps");
                Haptics.selectionAsync();
              }}
              style={[styles.modeTab, tradeMode === "perps" && styles.modeTabActive]}
            >
              <Icon
                name="trending-up"
                size={14}
                color={tradeMode === "perps" ? colors.brand : colors.muted}
              />
              <Text style={[styles.modeTabText, tradeMode === "perps" && styles.modeTabTextActive]}>
                PERPETUALS
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setTradeMode("hunch");
                Haptics.selectionAsync();
              }}
              style={[styles.modeTab, tradeMode === "hunch" && styles.modeTabActive]}
            >
              <Icon
                name="flash"
                size={14}
                color={tradeMode === "hunch" ? colors.brand : colors.muted}
              />
              <Text style={[styles.modeTabText, tradeMode === "hunch" && styles.modeTabTextActive]}>
                60s UP/DOWN
              </Text>
            </Pressable>
          </View>
        </View>

        {tradeMode === "perps" ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={{
              flex: 1,
              width: "100%",
              alignSelf: "stretch",
              marginTop: 0,
              paddingBottom: 8,
            }}
          >
            <PerpTradingTicket />
          </Animated.View>
        ) : (
          <ScrollView
            style={{ flex: 1, width: "100%", alignSelf: "stretch" }}
            contentContainerStyle={{
              width: "100%",
              alignItems: "stretch",
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: 32,
              gap: 14,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Stake Amount Header */}
            <View style={styles.stakeHeaderRow}>
              <Text style={styles.stakeLabel}>STAKE AMOUNT</Text>
              <Text style={styles.balanceSub}>
                Balance: {me ? Number(me.ausd).toFixed(2) : "—"} AUSD
              </Text>
            </View>

            {/* Amount chips */}
            <View style={styles.amountRow}>
              {["5", "10", "25", "50"].map((a) => (
                <Pressable
                  key={a}
                  onPress={() => {
                    setAmount(a);
                    Haptics.selectionAsync();
                  }}
                  style={[styles.stakeChip, amount === a && styles.stakeChipActive]}
                >
                  <Text style={[styles.stakeChipText, amount === a && styles.stakeChipTextActive]}>
                    ${a}
                  </Text>
                </Pressable>
              ))}
              <View style={styles.editChip}>
                <Text style={styles.editChipText}>AUSD</Text>
              </View>
            </View>

            {/* Swipe Direction Hint */}
            <View style={styles.directionHintRow}>
              <Text style={styles.swipeBearText}>← DOWN</Text>
              <Text style={styles.swipeBullText}>UP →</Text>
            </View>

            {/* Hero swipe card */}
            <GestureDetector gesture={pan}>
              <Animated.View style={[styles.card, cardStyle]}>
                <Animated.View
                  pointerEvents="none"
                  style={[styles.flash, flashStyle]}
                />

                {/* Card Top: Asset & Oracle Info */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.assetBadge}>
                    <Icon name="flash" size={14} color={colors.brand} />
                    <Text style={styles.assetName}>{getSelectedMarket().symbol} / USD</Text>
                  </View>
                  <Text style={styles.roundOracleText}>
                    Monad · R#{round?.roundId || "—"} · Pyth
                  </Text>
                </View>

                {/* Circular Countdown Display */}
                <View style={styles.circleTimerWrap}>
                  <View style={styles.outerRing}>
                    <Animated.Text style={[styles.circleCountdownText, countdownStyle]}>
                      {remainingDisplay}s
                    </Animated.Text>
                    <Text style={styles.circleSubText}>SECONDS LEFT</Text>
                  </View>
                  <View style={styles.locksInBadge}>
                    <Text style={styles.locksInText}>
                      OPEN
                    </Text>
                  </View>
                </View>

                {/* Strike */}
                <View style={styles.strikeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.strikeColLabel}>STRIKE</Text>
                    <Text style={styles.strikePrice} numberOfLines={1}>
                      ${strikeLabel}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", maxWidth: "42%" }}>
                    <Text style={styles.strikeColLabel}>SPOT</Text>
                    <Text style={styles.livePriceText} numberOfLines={1}>
                      {data?.spot
                        ? `${(Number(data.spot.yes) * 100).toFixed(0)}¢ / ${(
                            Number(data.spot.no) * 100
                          ).toFixed(0)}¢`
                        : "—"}
                    </Text>
                  </View>
                </View>

                {/* Odds & Pool Volume Bar */}
                <View style={styles.oddsBarSection}>
                  <View style={styles.oddsHeaderRow}>
                    <Text style={styles.oddsUpLabel}>
                      UP {data?.spot ? `${(Number(data.spot.yes) * 100).toFixed(0)}¢` : "—"}
                    </Text>
                    <Text style={styles.oddsDownLabel}>
                      {data?.spot ? `${(Number(data.spot.no) * 100).toFixed(0)}¢ ` : ""}DOWN
                    </Text>
                  </View>
                  <View style={styles.splitOddsBar}>
                    <View style={[styles.splitOddsUp, { flex: 58 }]} />
                    <View style={[styles.splitOddsDown, { flex: 42 }]} />
                  </View>
                  <View style={styles.oddsSubRow}>
                    <Text style={styles.oddsSubText} numberOfLines={1}>
                      {quoteLine || "CPMM odds · live"}
                    </Text>
                  </View>
                </View>

                {/* Drag Hint */}
                <View style={styles.dragHintBox}>
                  <Text style={styles.dragHintText}>Swipe card · or tap below</Text>
                </View>
              </Animated.View>
            </GestureDetector>

            {/* Dual Big Action Buttons */}
            <View style={styles.dualActionRow}>
              <Pressable
                onPress={() => onPick("DOWN")}
                disabled={!canTrade}
                style={[styles.bigDownBtn, !canTrade && { opacity: 0.45 }]}
              >
                <Text style={styles.bigDownTitle}>DOWN</Text>
                <Text style={styles.bigDownPayout} numberOfLines={1}>
                  {amount} AUSD
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onPick("UP")}
                disabled={!canTrade}
                style={[styles.bigUpBtn, !canTrade && { opacity: 0.45 }]}
              >
                <Text style={styles.bigUpTitle}>UP</Text>
                <Text style={styles.bigUpPayout} numberOfLines={1}>
                  {amount} AUSD
                </Text>
              </Pressable>
            </View>

            {/* Footnote */}
            <View style={styles.footnoteRow}>
              <Icon name="shield-checkmark-outline" size={14} color={colors.muted} />
              <Text style={styles.footnoteText} numberOfLines={2}>
                {canTrade
                  ? "Onchain · Monad testnet · Pyth settle"
                  : "Waiting for a live round"}
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    // Full-bleed shell — horizontal inset applied on bars/scroll, not double-counted
    paddingHorizontal: 0,
    backgroundColor: "#0A0B0D",
    paddingBottom: 0,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
    paddingHorizontal: 12,
    width: "100%",
  },
  topBrandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  networkPulseWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.up,
  },
  topNetworkText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  topBalancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161922",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    gap: 4,
    borderWidth: 1,
    borderColor: "#20242D",
  },
  ausdBadge: {
    backgroundColor: colors.brand,
    color: "#000",
    fontSize: 9,
    fontFamily: type.bold,
    width: 13,
    height: 13,
    borderRadius: 7,
    textAlign: "center",
    lineHeight: 13,
  },
  balanceNum: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "700",
  },
  balanceUnit: {
    color: colors.muted,
    fontSize: 9,
    fontFamily: type.bold,
  },
  plusIcon: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "bold",
  },
  modeSegment: {
    flexDirection: "row",
    width: "100%",
    marginHorizontal: 0,
    paddingHorizontal: 12,
    backgroundColor: "transparent",
    marginBottom: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  modeInner: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#12141A",
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modeTabActive: {
    backgroundColor: "rgba(214,255,63,0.15)",
    borderWidth: 1,
    borderColor: colors.brand,
  },
  modeTabText: {
    fontFamily: type.bold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  modeTabTextActive: {
    color: colors.brand,
  },
  stakeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    width: "100%",
  },
  stakeLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  balanceSub: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    width: "100%",
  },
  stakeChip: {
    flex: 1,
    backgroundColor: "#12141A",
    paddingVertical: 7,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  stakeChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  stakeChipText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 12,
    fontWeight: "bold",
  },
  stakeChipTextActive: {
    color: "#000000",
  },
  editChip: {
    backgroundColor: "#151922",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  editChipText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
  },
  directionHintRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    width: "100%",
  },
  swipeBearText: {
    color: colors.down,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  swipeBullText: {
    color: colors.up,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  card: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: "#12141A",
    gap: 8,
    overflow: "hidden",
  },
  flash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  assetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D0F14",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 4,
  },
  boltIcon: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "bold",
  },
  assetName: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 12,
  },
  roundOracleText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
  },
  circleTimerWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  outerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0C0E14",
  },
  circleCountdownText: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 22,
    fontWeight: "800",
  },
  circleSubText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  locksInBadge: {
    backgroundColor: "rgba(255,77,106,0.18)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  locksInText: {
    color: colors.down,
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "bold",
  },
  strikeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0C0E14",
    padding: 10,
    borderRadius: radius.md,
  },
  strikeColLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 8,
    letterSpacing: 0.6,
  },
  strikePrice: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 2,
  },
  livePriceText: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 2,
  },
  livePriceDelta: {
    fontSize: 10,
  },
  oddsBarSection: {
    gap: 4,
  },
  oddsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  oddsUpLabel: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "600",
  },
  oddsDownLabel: {
    color: colors.down,
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "600",
  },
  splitOddsBar: {
    height: 8,
    flexDirection: "row",
    borderRadius: 4,
    overflow: "hidden",
  },
  splitOddsUp: {
    backgroundColor: colors.up,
  },
  splitOddsDown: {
    backgroundColor: colors.down,
  },
  oddsSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  oddsSubText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
  },
  dragHintBox: {
    alignItems: "center",
    paddingVertical: 4,
  },
  dragHintText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  dualActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    width: "100%",
  },
  bigDownBtn: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.down,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bigDownTitle: {
    color: "#FFFFFF",
    fontFamily: type.bold,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  bigDownPayout: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: type.data,
    fontSize: 10,
  },
  bigUpBtn: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.up,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bigUpTitle: {
    color: "#000000",
    fontFamily: type.bold,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  bigUpPayout: {
    color: "#000000",
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "600",
  },
  footnoteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 4,
    paddingBottom: 2,
  },
  checkIcon: {
    color: colors.brand,
    fontSize: 10,
  },
  footnoteText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
  },
  error: {
    color: colors.danger,
    fontFamily: type.body,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  quote: {
    color: colors.ink,
    fontFamily: type.medium,
    fontSize: 13,
    marginTop: 14,
  },
});
