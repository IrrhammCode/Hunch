import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { haptic as hapticFx } from "@/src/utils/clipboard";
const Haptics = {
  selectionAsync: () => hapticFx("selection"),
  impactAsync: (_style?: unknown) => hapticFx("medium"),
  notificationAsync: (t?: number) => hapticFx(t === 2 ? "error" : t === 1 ? "warning" : "success"),
  ImpactFeedbackStyle: { Medium: "medium", Light: "light" },
  NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
};
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchMarketBoard,
  type MarketBoardRow,
} from "@/src/api/client";
import { MockBanner } from "@/src/components/MockBanner";
import { mockMarketBoard } from "@/src/mock/fixtures";
import { USE_MOCK } from "@/src/config/chain";
import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { AmountChip, PrimaryButton } from "@/src/components/ui";
import { explorerTx } from "@/src/config/chain";
import { getSelectedMarket, setSelectedMarket } from "@/src/market/selection";
import { placeWalletTrade } from "@/src/wallet/privyTrade";
import { useWallet } from "@/src/wallet/WalletContext";
import { colors, monoStyle, radius, space, type } from "@/src/theme";

const SIZES = ["5", "10", "25"] as const;

/** CPMM event-market exchange UI — UP/DOWN contracts, not TradFi vanilla options. */
export default function OptionsExchangeScreen() {
  const insets = useSafeAreaInsets();
  const { user, getEthereumProvider } = useAuth();
  const { refresh: refreshWallet } = useWallet();
  const toast = useToast();

  const [rows, setRows] = useState<MarketBoardRow[]>([]);
  const [symbol, setSymbol] = useState(getSelectedMarket().symbol || "BTC");
  const [amount, setAmount] = useState<string>("10");
  const [busy, setBusy] = useState<"UP" | "DOWN" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastFill, setLastFill] = useState<{ side: string; symbol: string; tx: string; roundId: string } | null>(null);

  const load = useCallback(async () => {
    try {
      if (USE_MOCK) {
        const board = mockMarketBoard() as any;
        setRows(board.markets);
        setErr(null);
        return;
      }
      const board = await fetchMarketBoard("monad");
      setRows(board.markets.filter((m) => m.chain === "monad"));
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "exchange feed down");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [load]);

  const live = rows.filter((r) => r.status === "open");
  const active =
    live.find((r) => r.symbol === symbol) ??
    live[0] ??
    rows.find((r) => r.symbol === symbol);

  useEffect(() => {
    if (active?.symbol && active.symbol !== getSelectedMarket().symbol) {
      setSelectedMarket({
        symbol: active.symbol,
        pair: active.pair,
        label: active.label || active.pair,
        market: active.market,
        roundId: active.roundId,
        chain: active.chain,
        chainId: active.chainId,
      });
    }
  }, [active]);

  const upC = active?.spot ? Number(active.spot.yes) * 100 : null;
  const dnC = active?.spot ? Number(active.spot.no) * 100 : null;
  const canTrade = Boolean(active?.status === "open" && active.market);

  const onBuy = async (side: "UP" | "DOWN") => {
    if (!canTrade || !active) {
      toast.show("Market closed", { body: "Keeper is listing the next series." });
      return;
    }
    if (!user?.address) {
      toast.error("Auth required", "Sign in with Face ID / Mera passkey first.");
      return;
    }
    setBusy(side);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setSelectedMarket({
        symbol: active.symbol,
        pair: active.pair,
        label: active.label || active.pair,
        market: active.market,
        roundId: active.roundId,
        chain: active.chain,
        chainId: active.chainId,
      });

      let hash = "";
      let roundId = active.roundId || "—";
      const provider = await getEthereumProvider();
      const result = await placeWalletTrade({
        provider,
        address: user.address,
        side,
        amountAUSD: amount,
        symbol: active.symbol,
        market: active.market || undefined,
      });
      hash = result.executeTx;
      roundId = result.roundId || roundId;

      setLastFill({ side, symbol: active.symbol, tx: hash, roundId });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshWallet();
      toast.show("Filled", {
        body: `${active.symbol} ${side} ${amount} AUSD · R${roundId}`,
        tone: "success",
        actionLabel: hash ? "View tx" : undefined,
        onAction: hash
          ? () => {
              LinkingOpen(hash);
            }
          : undefined,
      });
      load();
    } catch (e) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error("Order failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 16 }]}>
        <MockBanner />
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>EXCHANGE</Text>
            <Text style={styles.sub}>Options exchange · short-horizon event markets</Text>
          </View>
          <Pressable onPress={load} hitSlop={12}>
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          CPMM UP/DOWN series · Pyth settle on Monad · not vanilla call/put
        </Text>

        {err ? <Text style={styles.error}>{err}</Text> : null}

        {/* Instrument strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
          {(live.length ? live : rows).map((r) => {
            const on = r.symbol === active?.symbol && r.chain === active?.chain;
            return (
              <Pressable
                key={`${r.chain}-${r.symbol}`}
                onPress={() => setSymbol(r.symbol)}
                style={[styles.instChip, on && styles.instChipOn]}
              >
                <Text style={[styles.instSym, on && { color: colors.brand }]}>{r.symbol}</Text>
                <Text style={monoStyle(11, on ? colors.ink : colors.muted)}>
                  {r.status === "open" && r.spot
                    ? `${(Number(r.spot.yes) * 100).toFixed(0)}¢`
                    : r.status.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Active series book */}
        <View style={styles.book}>
          <View style={styles.bookHead}>
            <Text style={monoStyle(13, colors.ink)}>
              {active?.pair || `${symbol}-USD`}
            </Text>
            <Text style={monoStyle(12, colors.muted)}>
              {(active?.chain || "monad").toUpperCase()}
              {active?.settlementHub ? " ★" : ""} ·{" "}
              {active?.status === "open" && active.timeRemaining != null
                ? `${Math.ceil(active.timeRemaining)}s`
                : (active?.status || "—").toUpperCase()}
            </Text>
          </View>

          <View style={styles.quoteGrid}>
            <View style={[styles.quoteBox, { borderColor: "rgba(46,229,157,0.4)" }]}>
              <Text style={[styles.qLabel, { color: colors.up }]}>UP · BUY</Text>
              <Text style={[styles.qPrice, { color: colors.up }]}>
                {upC != null ? `${upC.toFixed(0)}¢` : "—"}
              </Text>
              <Text style={monoStyle(11, colors.muted)}>bid/ask CPMM</Text>
            </View>
            <View style={[styles.quoteBox, { borderColor: "rgba(255,77,106,0.4)" }]}>
              <Text style={[styles.qLabel, { color: colors.down }]}>DOWN · BUY</Text>
              <Text style={[styles.qPrice, { color: colors.down }]}>
                {dnC != null ? `${dnC.toFixed(0)}¢` : "—"}
              </Text>
              <Text style={monoStyle(11, colors.muted)}>bid/ask CPMM</Text>
            </View>
          </View>

          <View style={styles.sizeRow}>
            <Text style={styles.sizeLabel}>Size</Text>
            {SIZES.map((s) => (
              <AmountChip key={s} value={s} selected={amount === s} onPress={() => setAmount(s)} />
            ))}
            <Text style={monoStyle(12, colors.muted)}>AUSD</Text>
          </View>

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={busy === "DOWN" ? "…" : `Buy DOWN ${amount}`}
                tone="down"
                disabled={!canTrade || busy !== null}
                onPress={() => onBuy("DOWN")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={busy === "UP" ? "…" : `Buy UP ${amount}`}
                tone="up"
                disabled={!canTrade || busy !== null}
                onPress={() => onBuy("UP")}
              />
            </View>
          </View>

          {!canTrade ? (
            <Text style={styles.hint}>No open series — wait for keeper or open Markets.</Text>
          ) : null}

          {lastFill ? (
            <Pressable
              onPress={() => {
                LinkingOpen(lastFill.tx);
              }}
              style={styles.fillRow}
            >
              <Text style={monoStyle(12, colors.brand)}>
                LAST {lastFill.symbol} {lastFill.side} · R{lastFill.roundId} · view tx →
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Listed series blotter */}
        <Text style={styles.listHead}>LISTED SERIES</Text>
        <ScrollView
          style={{ flex: 1, width: "100%", alignSelf: "stretch" }}
          contentContainerStyle={{
            width: "100%",
            alignItems: "stretch",
            gap: 10,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((r) => (
            <Pressable
              key={`list-${r.symbol}`}
              onPress={() => setSymbol(r.symbol)}
              style={[styles.listRow, r.symbol === active?.symbol && styles.listRowOn]}
            >
              <Text style={monoStyle(14, colors.ink)}>{r.pair}</Text>
              <Text style={monoStyle(12, colors.muted)}>
                {r.spot
                  ? `UP ${(Number(r.spot.yes) * 100).toFixed(0)}¢  DN ${(Number(r.spot.no) * 100).toFixed(0)}¢`
                  : r.reason || r.status}
              </Text>
              <Text style={monoStyle(12, r.status === "open" ? colors.brand : colors.muted)}>
                {r.status === "open" ? "LIVE" : r.status.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

function LinkingOpen(hash: string) {
  Linking.openURL(explorerTx(hash, getSelectedMarket().chain || "monad")).catch(() => {
    router.push("/(app)/positions");
  });
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: "100%", alignSelf: "stretch", paddingHorizontal: 14, gap: 10, paddingBottom: 0 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 44,
    letterSpacing: 1,
  },
  sub: { color: colors.muted, fontFamily: type.body, fontSize: 13 },
  refresh: { color: colors.muted, fontFamily: type.medium, fontSize: 13, marginTop: 12 },
  disclaimer: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  error: { color: colors.danger, fontFamily: type.body, fontSize: 13 },
  strip: { flexGrow: 0 },
  instChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: colors.bgElevated,
    minWidth: 72,
    alignItems: "center",
  },
  instChipOn: { borderColor: colors.brand, backgroundColor: colors.brandDim },
  instSym: { color: colors.ink, fontFamily: type.bold, fontSize: 14 },
  book: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    padding: space.md,
    backgroundColor: colors.bgCard,
    gap: 12,
  },
  bookHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quoteGrid: { flexDirection: "row", gap: 10 },
  quoteBox: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: space.sm,
    gap: 4,
    backgroundColor: colors.bgElevated,
  },
  qLabel: { fontFamily: type.bold, fontSize: 11, letterSpacing: 1 },
  qPrice: { fontFamily: type.data, fontSize: 32, fontVariant: ["tabular-nums"] },
  sizeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sizeLabel: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  actions: { flexDirection: "row", gap: 10 },
  hint: { color: colors.muted, fontFamily: type.body, fontSize: 12, textAlign: "center" },
  fillRow: { alignItems: "center", paddingVertical: 4 },
  listHead: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 8,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    backgroundColor: colors.bgElevated,
  },
  listRowOn: { borderColor: colors.brand },
});
