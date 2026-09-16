import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  API_URL,
  demoTrade,
  fetchCurrentRound,
  fetchQuote,
  fetchRound,
  type CurrentRoundResponse,
} from "@/src/api/client";
import { BrandMark } from "@/src/components/BrandMark";
import { Screen } from "@/src/components/Screen";
import { PrimaryButton } from "@/src/components/ui";
import { addHunch, listHunches, settleRound } from "@/src/hunchBook";
import { useWallet } from "@/src/wallet/WalletContext";
import { colors, space } from "@/src/theme";

const AMOUNTS = ["5", "10", "25"] as const;
const SWIPE_X = Dimensions.get("window").width * 0.28;

function formatStrike(raw: string, expo: number) {
  const n = Number(raw) * Math.pow(10, expo);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function HunchScreen() {
  const insets = useSafeAreaInsets();
  const { me, refresh: refreshWallet } = useWallet();
  const [data, setData] = useState<CurrentRoundResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<"UP" | "DOWN" | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [amount, setAmount] = useState<string>("10");
  const [quoteLine, setQuoteLine] = useState<string | null>(null);
  const settledRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  const tx = useSharedValue(0);

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
              Alert.alert(won ? "You won" : "You lost", `${outcome}\n${line}`);
            }
          }
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "API offline";
      setErr(`${msg} → ${API_URL}`);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const round = data?.round;
  const open = round?.status === "open";
  const remainingSec = open && endsAt != null ? Math.max(0, (endsAt - nowMs) / 1000) : 0;
  const remainingDisplay =
    open && endsAt != null
      ? remainingSec >= 10
        ? `${Math.ceil(remainingSec)}`
        : remainingSec.toFixed(1)
      : "—";

  // Live quote for selected amount
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
        Alert.alert("API offline", "Cannot reach PC API on Wi‑Fi.");
        return;
      }
      if (!open || !round) {
        Alert.alert("No live round", "Wait for countdown.");
        return;
      }
      if (remainingSec < 12) {
        Alert.alert("Too late", "Under 12s left — wait for next round.");
        return;
      }

      busyRef.current = true;
      setBusy(true);
      setPicked(side);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const result = await demoTrade(side, amount);
        await addHunch({
          roundId: result.roundId,
          side,
          amountAUSD: result.amountAUSD,
          yes: result.yes,
          no: result.no,
          tx: result.executeTx,
        });
        setLastResult(`${side} open · round ${result.roundId}`);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await Promise.all([refresh(), refreshWallet()]);
        Alert.alert(
          `${side} filled`,
          `${amount} AUSD · round ${result.roundId}\nCheck BOOK after expiry to claim.`,
        );
      } catch (e) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Trade failed", e instanceof Error ? e.message : String(e));
      } finally {
        busyRef.current = false;
        setBusy(false);
        tx.value = withSpring(0);
      }
    },
    [err, open, round, remainingSec, amount, refresh, refreshWallet, tx],
  );

  const pan = Gesture.Pan()
    .enabled(open && !busy)
    .onUpdate((e) => {
      tx.value = Math.max(-140, Math.min(140, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_X) {
        tx.value = withSpring(220);
        runOnJS(onPick)("UP");
      } else if (e.translationX < -SWIPE_X) {
        tx.value = withSpring(-220);
        runOnJS(onPick)("DOWN");
      } else {
        tx.value = withSpring(0);
        runOnJS(Haptics.selectionAsync)();
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { rotate: `${interpolate(tx.value, [-140, 0, 140], [-8, 0, 8])}deg` },
    ],
    borderColor: interpolateColor(
      tx.value,
      [-100, 0, 100],
      [colors.down, colors.line, colors.up],
    ),
  }));

  const upHint = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, 80], [0.15, 1]),
  }));
  const downHint = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-80, 0], [1, 0.15]),
  }));

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.top}>
          <BrandMark size="sm" />
          <View style={styles.topRight}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {me ? `${Number(me.ausd).toFixed(0)} AUSD` : "… AUSD"}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                refresh();
                refreshWallet();
              }}
            >
              <Text style={styles.refresh}>Refresh</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.amountRow}>
          {AMOUNTS.map((a) => (
            <Pressable
              key={a}
              onPress={() => {
                setAmount(a);
                Haptics.selectionAsync();
              }}
              style={[styles.amountChip, amount === a && styles.amountChipOn]}
            >
              <Text style={[styles.amountText, amount === a && styles.amountTextOn]}>{a}</Text>
            </Pressable>
          ))}
          <Text style={styles.amountLabel}>AUSD</Text>
        </View>

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.card, cardStyle]}>
            <View style={styles.hintRow}>
              <Animated.Text style={[styles.hintDown, downHint]}>← DOWN</Animated.Text>
              <Animated.Text style={[styles.hintUp, upHint]}>UP →</Animated.Text>
            </View>
            <Text style={styles.kicker}>{open ? `ROUND ${round?.roundId}` : "WAITING"}</Text>
            <Text style={styles.countdown}>{remainingDisplay}</Text>
            <Text style={styles.secLabel}>{open ? "SECONDS" : ""}</Text>
            <Text style={styles.strikeLabel}>BTC strike</Text>
            <Text style={styles.strike}>
              {round ? `$${formatStrike(round.strike, round.expo)}` : "No live round"}
            </Text>
            {data?.spot ? (
              <Text style={styles.odds}>
                UP {(Number(data.spot.yes) * 100).toFixed(0)}¢ · DOWN{" "}
                {(Number(data.spot.no) * 100).toFixed(0)}¢
              </Text>
            ) : null}
            {quoteLine ? <Text style={styles.quote}>{quoteLine}</Text> : null}
            {lastResult ? <Text style={styles.result}>{lastResult}</Text> : null}
            {err ? <Text style={styles.error}>{err}</Text> : null}
            <Text style={styles.swipeCue}>Swipe the card · or tap below</Text>
          </Animated.View>
        </GestureDetector>

        <View style={styles.actions}>
          <View style={styles.row}>
            <View style={styles.half}>
              <PrimaryButton
                label={busy && picked === "DOWN" ? "…" : "DOWN"}
                tone="down"
                disabled={busy}
                onPress={() => onPick("DOWN")}
              />
            </View>
            <View style={styles.half}>
              <PrimaryButton
                label={busy && picked === "UP" ? "…" : "UP"}
                tone="up"
                disabled={busy}
                onPress={() => onPick("UP")}
              />
            </View>
          </View>
          <Text style={styles.note}>
            {busy
              ? `Sending ${picked} · ${amount} AUSD…`
              : open
                ? `Swipe right UP · left DOWN · ${amount} AUSD`
                : "Waiting for keeper to open the next round."}
          </Text>
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
  topRight: { alignItems: "flex-end", gap: 8 },
  chip: {
    backgroundColor: colors.brandDim,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    color: colors.brand,
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  refresh: {
    color: colors.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  amountChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.bgElevated,
  },
  amountChipOn: {
    borderColor: colors.brand,
    backgroundColor: colors.brandDim,
  },
  amountText: {
    color: colors.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  amountTextOn: { color: colors.brand },
  amountLabel: {
    color: colors.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    marginLeft: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 28,
    paddingVertical: 22,
    paddingHorizontal: 18,
    backgroundColor: "rgba(18,20,26,0.92)",
    alignItems: "center",
    gap: 4,
  },
  hintRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  hintUp: {
    color: colors.up,
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    letterSpacing: 1,
  },
  hintDown: {
    color: colors.down,
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    letterSpacing: 1,
  },
  kicker: {
    color: colors.brand,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    letterSpacing: 2,
  },
  countdown: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  secLabel: {
    color: colors.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 8,
  },
  strikeLabel: {
    color: colors.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  strike: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 40,
    letterSpacing: 1,
  },
  odds: {
    color: colors.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    marginTop: 8,
  },
  quote: {
    color: colors.ink,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    marginTop: 6,
  },
  result: {
    color: colors.brand,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  swipeCue: {
    color: colors.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 14,
  },
  actions: { gap: 12 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  note: {
    color: colors.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
