import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchMarketBoard,
  fetchPerplMarkets,
  fetchPriceHistory,
  fetchPriceLatest,
  type MarketBoardRow,
  type PerplMarket,
} from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import { PriceChart } from "@/src/components/PriceChart";
import { AmountChip, PrimaryButton } from "@/src/components/ui";
import { getSelectedMarket, setSelectedMarket } from "@/src/market/selection";
import { useWallet } from "@/src/wallet/WalletContext";
import { placePrivyTrade } from "@/src/wallet/privyTrade";
import { colors, monoStyle, radius, space, type } from "@/src/theme";

const { width: W } = Dimensions.get("window");
const CHART_W = Math.min(W - 28, 360);
const SIZES = ["5", "10", "25"] as const;

export default function MarketDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ symbol?: string; kind?: string }>();
  const symbol = (params.symbol || getSelectedMarket().symbol || "BTC").toUpperCase();
  const kind = params.kind === "perp" ? "perp" : params.kind === "blitz" ? "blitz" : "auto";

  const { user, privyMode, getEthereumProvider } = useAuth();
  const { me, refresh: refreshWallet } = useWallet();
  const toast = useToast();

  const [price, setPrice] = useState<number | null>(null);
  const [bars, setBars] = useState<{ t: number; c: number }[]>([]);
  const [blitz, setBlitz] = useState<MarketBoardRow | null>(null);
  const [perp, setPerp] = useState<PerplMarket | null>(null);
  const [amount, setAmount] = useState("10");
  const [busy, setBusy] = useState<"UP" | "DOWN" | "LONG" | "SHORT" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [hist, latest, board, perps] = await Promise.allSettled([
        fetchPriceHistory(symbol, 1, 90),
        fetchPriceLatest(symbol),
        fetchMarketBoard("monad"),
        fetchPerplMarkets(),
      ]);
      if (hist.status === "fulfilled") {
        const b = hist.value.bars || [];
        setBars(b.map((x) => ({ t: x.t, c: x.c })));
        if (hist.value.last != null) setPrice(hist.value.last);
      }
      if (latest.status === "fulfilled" && latest.value.price) {
        setPrice(latest.value.price);
      }
      if (board.status === "fulfilled") {
        const row =
          board.value.markets.find((m) => m.symbol === symbol) ||
          board.value.markets.find((m) => m.status === "open") ||
          board.value.markets[0] ||
          null;
        setBlitz(row);
        if (row) {
          setSelectedMarket({
            symbol: row.symbol,
            pair: row.pair,
            label: row.label || row.pair,
            market: row.market,
            roundId: row.roundId,
            chain: row.chain,
            chainId: row.chainId,
          });
        }
      }
      if (perps.status === "fulfilled") {
        const p = perps.value.markets.find((m) => m.symbol.toUpperCase() === symbol) || null;
        setPerp(p);
        if (p?.markPrice && price == null) setPrice(p.markPrice);
      }
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load market");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const changePct = useMemo(() => {
    if (bars.length < 2) return perp?.change24hPct ?? 0;
    const first = bars[0]!.c;
    const last = bars[bars.length - 1]!.c;
    if (!first) return 0;
    return ((last - first) / first) * 100;
  }, [bars, perp]);

  const showBlitz = kind === "blitz" || (kind === "auto" && !perp);
  const showPerp = kind === "perp" || (kind === "auto" && Boolean(perp));
  const blitzOpen = blitz?.status === "open" && Boolean(blitz.market);

  const onBlitz = async (side: "UP" | "DOWN") => {
    if (!blitzOpen || !blitz) {
      toast.error("Market closed", "Keeper is opening the next 60s round.");
      return;
    }
    if (!user?.address) {
      toast.error("Sign in required", "Use Mera passkey or Privy first.");
      return;
    }
    setBusy(side);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setSelectedMarket({
        symbol: blitz.symbol,
        pair: blitz.pair,
        label: blitz.label || blitz.pair,
        market: blitz.market,
        roundId: blitz.roundId,
        chain: blitz.chain,
        chainId: blitz.chainId,
      });
      const provider = await getEthereumProvider();
      const result = await placePrivyTrade({
        provider,
        address: user.address,
        side,
        amountAUSD: amount,
        symbol: blitz.symbol,
        market: blitz.market || undefined,
      });
      await refreshWallet();
      toast.show("Order sent", {
        body: `${blitz.symbol} ${side} ${amount} AUSD · tx ${result.executeTx.slice(0, 10)}…`,
        tone: "success",
      });
      load();
    } catch (e: any) {
      toast.error("Trade failed", e?.message || String(e));
    } finally {
      setBusy(null);
    }
  };

  const onPerp = async (side: "LONG" | "SHORT") => {
    if (!perp) {
      toast.error("No perp market", "Start API — Perpl markets load from testnet.");
      return;
    }
    if (!user?.address) {
      toast.error("Sign in required", "Use Mera passkey or Privy first.");
      return;
    }
    setBusy(side);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { placePerplOrder } = await import("@/src/api/client");
      const marginNum = Number(amount) || 10;
      const res = await placePerplOrder({
        trader: user.address,
        symbol: perp.symbol,
        side,
        marginAUSD: marginNum,
        leverage: 2,
      });
      if (!res.success) throw new Error("Perpl order rejected");
      toast.show("Perpl order", {
        body: `${side} ${perp.symbol} ${marginNum} AUSD · live fill`,
        tone: "success",
      });
      refreshWallet();
    } catch (e: any) {
      toast.error("Perpl order failed", e?.message || String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Icon name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{symbol}</Text>
            <Text style={styles.sub}>
              {showPerp && perp ? "Perpl perp · AUSD" : "60s blitz · Pyth"} · Monad
            </Text>
          </View>
          <Pressable onPress={load} hitSlop={12}>
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{ paddingBottom: 36, gap: 14, alignItems: "stretch" }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>MARK PRICE</Text>
            <Text style={styles.priceVal}>
              ${price != null
                ? price >= 1000
                  ? price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : price.toFixed(price >= 1 ? 2 : 4)
                : "—"}
            </Text>
            <Text style={[styles.delta, changePct >= 0 ? styles.up : styles.down]}>
              {changePct >= 0 ? "+" : ""}
              {changePct.toFixed(2)}%
            </Text>
            {loading ? <ActivityIndicator color={colors.brand} style={{ marginTop: 6 }} /> : null}
            {err ? <Text style={styles.err}>{err}</Text> : null}
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartLabel}>PYTH · 1m CANDLES</Text>
            {bars.length >= 2 ? (
              <PriceChart points={bars} width={CHART_W} height={200} />
            ) : (
              <View style={[styles.chartEmpty, { width: CHART_W, height: 200 }]}>
                <Text style={styles.chartEmptyText}>
                  Loading chart… (API /v1/price/{symbol}/history)
                </Text>
              </View>
            )}
          </View>

          {showBlitz ? (
            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={styles.panelTitle}>60s BLITZ · UP/DOWN</Text>
                <Text style={monoStyle(12, blitzOpen ? colors.brand : colors.muted)}>
                  {blitz
                    ? blitz.status === "open"
                      ? `${Math.ceil(blitz.timeRemaining || 0)}s · R${blitz.roundId}`
                      : blitz.status.toUpperCase()
                    : "WAITING KEEPER"}
                </Text>
              </View>
              <Text style={styles.panelBody}>
                Strike settles via Pyth on Monad. Shares from CPMM on HunchMarket.
              </Text>
              <View style={styles.quotes}>
                <View style={styles.qBox}>
                  <Text style={[styles.qLabel, { color: colors.up }]}>UP</Text>
                  <Text style={styles.qPrice}>
                    {blitz?.spot ? `${(Number(blitz.spot.yes) * 100).toFixed(0)}¢` : "—"}
                  </Text>
                </View>
                <View style={styles.qBox}>
                  <Text style={[styles.qLabel, { color: colors.down }]}>DOWN</Text>
                  <Text style={styles.qPrice}>
                    {blitz?.spot ? `${(Number(blitz.spot.no) * 100).toFixed(0)}¢` : "—"}
                  </Text>
                </View>
              </View>
              <View style={styles.sizeRow}>
                {SIZES.map((s) => (
                  <AmountChip key={s} value={s} selected={amount === s} onPress={() => setAmount(s)} />
                ))}
                <Text style={monoStyle(12, colors.muted)}>AUSD</Text>
              </View>
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={busy === "DOWN" ? "…" : `DOWN ${amount}`}
                    tone="down"
                    disabled={!blitzOpen || busy !== null}
                    onPress={() => onBlitz("DOWN")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={busy === "UP" ? "…" : `UP ${amount}`}
                    tone="up"
                    disabled={!blitzOpen || busy !== null}
                    onPress={() => onBlitz("UP")}
                  />
                </View>
              </View>
              {!blitzOpen ? (
                <Text style={styles.hint}>
                  No open 60s round — keeper needs MON gas + Pyth pull. Board shows waiting markets.
                </Text>
              ) : null}
            </View>
          ) : null}

          {showPerp && perp ? (
            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={styles.panelTitle}>PERPL PERP · {perp.maxLeverage}x</Text>
                <Text style={monoStyle(12, colors.muted)}>
                  bid {perp.bidPrice} / ask {perp.askPrice}
                </Text>
              </View>
              <Text style={styles.panelBody}>
                Live Perpl testnet book. Collateral Agora AUSD. Account must be linked.
              </Text>
              <View style={styles.sizeRow}>
                {SIZES.map((s) => (
                  <AmountChip key={s} value={s} selected={amount === s} onPress={() => setAmount(s)} />
                ))}
                <Text style={monoStyle(12, colors.muted)}>AUSD margin</Text>
              </View>
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={busy === "SHORT" ? "…" : `SHORT ${amount}`}
                    tone="down"
                    disabled={busy !== null}
                    onPress={() => onPerp("SHORT")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={busy === "LONG" ? "…" : `LONG ${amount}`}
                    tone="up"
                    disabled={busy !== null}
                    onPress={() => onPerp("LONG")}
                  />
                </View>
              </View>
              <Text style={styles.hint}>
                Wallet {me?.address ? `${me.address.slice(0, 6)}…${me.address.slice(-4)}` : user?.address || "—"} · AUSD{" "}
                {me?.ausd ?? "—"}
              </Text>
            </View>
          ) : null}

          {!showPerp && !showBlitz ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Select instrument</Text>
              <Pressable onPress={() => router.setParams({ kind: "blitz" })}>
                <Text style={styles.link}>Trade 60s blitz</Text>
              </Pressable>
              <Pressable onPress={() => router.setParams({ kind: "perp" })}>
                <Text style={styles.link}>Trade Perpl perp</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: "100%", paddingHorizontal: 14 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 36,
    letterSpacing: 1,
  },
  sub: { color: colors.muted, fontFamily: type.body, fontSize: 12 },
  refresh: { color: colors.muted, fontFamily: type.medium, fontSize: 13 },
  priceBlock: { gap: 4 },
  priceLabel: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  priceVal: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
  },
  delta: { fontFamily: type.bold, fontSize: 14 },
  up: { color: colors.up },
  down: { color: colors.down },
  err: { color: colors.danger, fontFamily: type.body, fontSize: 12 },
  chartCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.sm,
    backgroundColor: colors.bgCard,
    gap: 8,
    alignItems: "center",
  },
  chartLabel: {
    alignSelf: "flex-start",
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 1,
  },
  chartEmpty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
  },
  chartEmptyText: { color: colors.muted, fontFamily: type.body, fontSize: 12, textAlign: "center", padding: 16 },
  panel: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    padding: space.md,
    backgroundColor: colors.bgCard,
    gap: 10,
  },
  panelHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  panelTitle: { color: colors.brand, fontFamily: type.data, fontSize: 12, letterSpacing: 1 },
  panelBody: { color: colors.muted, fontFamily: type.body, fontSize: 12, lineHeight: 18 },
  quotes: { flexDirection: "row", gap: 10 },
  qBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 10,
    backgroundColor: colors.bgElevated,
  },
  qLabel: { fontFamily: type.bold, fontSize: 11, letterSpacing: 1 },
  qPrice: { color: colors.ink, fontFamily: type.data, fontSize: 22 },
  sizeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actions: { flexDirection: "row", gap: 10 },
  hint: { color: colors.muted, fontFamily: type.body, fontSize: 11, textAlign: "center" },
  link: { color: colors.brand, fontFamily: type.bold, fontSize: 14, marginTop: 6 },
});
