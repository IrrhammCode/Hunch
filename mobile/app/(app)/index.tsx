import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Linking, StyleSheet, Text, View } from "react-native";
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
import { useToast } from "@/src/components/Toast";
import { AmountChip, BalanceChip, PrimaryButton } from "@/src/components/ui";
import { explorerTx } from "@/src/config/chain";
import { addHunch, listHunches, settleRound } from "@/src/hunchBook";
import { useWallet } from "@/src/wallet/WalletContext";
import { placePrivyTrade } from "@/src/wallet/privyTrade";
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
      const next = await fetchCurrentRound();
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
    const id = setInterval(refresh, 4000);
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
          });
          roundId = result.roundId;
          yes = result.yes;
          no = result.no;
          hash = result.executeTx;
          setLastResult(
            `${side} filled · R${roundId}${result.funded ? " · funded" : ""}`,
          );
        } else {
          const result = await demoTrade(side, amount);
          roundId = result.roundId;
          yes = result.yes;
          no = result.no;
          hash = result.executeTx;
          setLastResult(`${side} open · R${roundId}`);
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
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 10 },
        ]}
      >
        {/* Top bar */}
        <View style={styles.top}>
          <BrandMark size="md" />
          <BalanceChip label={me ? `${Number(me.ausd).toFixed(0)} AUSD` : "… AUSD"} />
        </View>

        {/* One-liner */}
        <Text style={styles.oneLiner}>Swipe UP or DOWN. 60-second markets on Monad.</Text>

        {/* Amount chips */}
        <View style={styles.amountRow}>
          {AMOUNTS.map((a) => (
            <AmountChip
              key={a}
              value={a}
              selected={amount === a}
              onPress={() => {
                setAmount(a);
                Haptics.selectionAsync();
              }}
            />
          ))}
          <Text style={styles.amountLabel}>AUSD</Text>
        </View>

        {/* Hero swipe card — the composition */}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.card, cardStyle]}>
            <Animated.View
              pointerEvents="none"
              style={[styles.flash, flashStyle]}
            />

            <View style={styles.hintRow}>
              <Animated.Text style={[styles.hintDown, downHint]}>← DOWN</Animated.Text>
              <Animated.Text style={[styles.hintUp, upHint]}>UP →</Animated.Text>
            </View>

            <Text style={styles.asset}>
              {open ? "BTC / USD" : data?.error ? "OFFLINE" : "NEXT ROUND"}
            </Text>
            <Text style={styles.roundId}>{open ? `ROUND ${round?.roundId}` : "KEEPER LOADING"}</Text>

            <Animated.Text style={[styles.countdown, countdownStyle]}>
              {loading && !round ? "··" : remainingDisplay}
            </Animated.Text>
            <Text style={styles.secLabel}>{open ? "SECONDS LEFT" : ""}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>STRIKE</Text>
                <Text style={styles.metaValue}>${strikeLabel}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>UP</Text>
                <Text style={[styles.metaValue, { color: colors.up }]}>
                  {data?.spot ? `${(Number(data.spot.yes) * 100).toFixed(0)}¢` : "—"}
                </Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>DOWN</Text>
                <Text style={[styles.metaValue, { color: colors.down }]}>
                  {data?.spot ? `${(Number(data.spot.no) * 100).toFixed(0)}¢` : "—"}
                </Text>
              </View>
            </View>

            {quoteLine ? (
              <Animated.Text entering={FadeIn} style={styles.quote}>
                {quoteLine}
              </Animated.Text>
            ) : null}

            {lastResult ? (
              <Animated.Text entering={FadeIn} exiting={FadeOut} style={styles.result}>
                {lastResult}
              </Animated.Text>
            ) : null}

            {err ? <Text style={styles.error}>{err}</Text> : null}

            <Text style={styles.swipeCue}>
              {canTrade ? "Swipe the card" : remainingSec > 0 && remainingSec < 12 ? "Too late this round" : "Hold for live market"}
            </Text>
          </Animated.View>
        </GestureDetector>

        {/* Soft fallback buttons */}
        <View style={styles.actions}>
          <View style={styles.row}>
            <View style={styles.half}>
              <PrimaryButton
                label={busy && picked === "DOWN" ? "…" : "DOWN"}
                tone="down"
                compact
                disabled={!canTrade && !(busy && picked === "DOWN")}
                onPress={() => onPick("DOWN")}
              />
            </View>
            <View style={styles.half}>
              <PrimaryButton
                label={busy && picked === "UP" ? "…" : "UP"}
                tone="up"
                compact
                disabled={!canTrade && !(busy && picked === "UP")}
                onPress={() => onPick("UP")}
              />
            </View>
          </View>
          <Text style={styles.note}>{note}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: space.lg,
    justifyContent: "space-between",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  oneLiner: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 2,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  amountLabel: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 11,
    marginLeft: 4,
    letterSpacing: 0.8,
  },
  card: {
    flex: 1,
    maxHeight: 460,
    minHeight: 320,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    borderRadius: radius.xl,
    paddingVertical: 22,
    paddingHorizontal: 18,
    backgroundColor: colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    overflow: "hidden",
  },
  flash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.brand,
    borderRadius: radius.xl,
  },
  hintRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
  },
  hintUp: {
    color: colors.up,
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  hintDown: {
    color: colors.down,
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  asset: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 18,
  },
  roundId: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 1.6,
    marginTop: 2,
  },
  countdown: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 108,
    lineHeight: 108,
    letterSpacing: 3,
    fontVariant: ["tabular-nums"],
    marginTop: 4,
  },
  secLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 4,
    width: "100%",
  },
  metaCol: { alignItems: "center", gap: 2, minWidth: 64 },
  metaLabel: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  metaValue: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 18,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.line,
  },
  quote: {
    color: colors.ink,
    fontFamily: type.medium,
    fontSize: 13,
    marginTop: 14,
  },
  result: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    fontFamily: type.body,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  swipeCue: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
    marginTop: 16,
    letterSpacing: 0.3,
  },
  actions: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  note: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
