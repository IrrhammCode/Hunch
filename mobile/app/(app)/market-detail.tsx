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
import { MockBanner } from "@/src/components/MockBanner";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import { PriceChart, type ChartPoint } from "@/src/components/PriceChart";
import { AmountChip, PrimaryButton } from "@/src/components/ui";
import { getSelectedMarket, setSelectedMarket } from "@/src/market/selection";
import { useWallet } from "@/src/wallet/WalletContext";
import { placePrivyTrade } from "@/src/wallet/privyTrade";
import { USE_MOCK } from "@/src/config/chain";
import { mockMarketBoard, mockPerplMarkets, mockPriceHistory, mockPriceLatest } from "@/src/mock/fixtures";
import { colors, monoStyle, radius, space, type } from "@/src/theme";

const { width: W } = Dimensions.get("window");
const CHART_W = W - 28;
const CHART_H = 248;
const SIZES = ["5", "10", "25"] as const;
const TFS = [
  { key: "1m", resolution: 1, bars: 90 },
  { key: "5m", resolution: 5, bars: 72 },
  { key: "15m", resolution: 15, bars: 64 },
  { key: "1H", resolution: 60, bars: 48 },
] as const;

function fmtUsd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(n >= 1 ? 2 : 4)}`;
}

function TokenBadge({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const bg =
    symbol === "BTC" ? "#F7931A" : symbol === "ETH" ? "#627EEA" : symbol === "SOL" ? "#14F195" : "#836EF9";
  const glyph = symbol === "BTC" ? "₿" : symbol === "ETH" ? "Ξ" : symbol === "SOL" ? "◎" : symbol.charAt(0);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#0A0B0D", fontSize: size * 0.45, fontWeight: "800" }}>{glyph}</Text>
    </View>
  );
}

export default function MarketDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ symbol?: string; kind?: string }>();
  const symbol = (params.symbol || getSelectedMarket().symbol || "BTC").toUpperCase();
  const initialKind = params.kind === "perp" ? "perp" : params.kind === "blitz" ? "blitz" : "auto";

  const { user, getEthereumProvider } = useAuth();
  const { me, refresh: refreshWallet } = useWallet();
  const toast = useToast();

  const [kind, setKind] = useState<"auto" | "perp" | "blitz">(initialKind);
  const [tf, setTf] = useState<(typeof TFS)[number]["key"]>("1m");
  const [price, setPrice] = useState<number | null>(null);
  const [bars, setBars] = useState<ChartPoint[]>([]);
  const [blitz, setBlitz] = useState<MarketBoardRow | null>(null);
  const [perp, setPerp] = useState<PerplMarket | null>(null);
  const [amount, setAmount] = useState("10");
  const [busy, setBusy] = useState<"UP" | "DOWN" | "LONG" | "SHORT" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  const tfCfg = TFS.find((t) => t.key === tf) || TFS[0]!;

  const loadMeta = useCallback(async () => {
    try {
      if (USE_MOCK) {
        const board = mockMarketBoard() as any;
        const perps = mockPerplMarkets();
        const latest = mockPriceLatest(symbol);
        setPrice(latest.price);
        const row =
          board.markets.find((m: any) => m.symbol === symbol) ||
          board.markets.find((m: any) => m.status === "open") ||
          board.markets[0] ||
          null;
        setBlitz(row);
        const p = perps.markets.find((m) => m.symbol.toUpperCase() === symbol) || null;
        setPerp(p);
        if (p?.markPrice) setPrice(p.markPrice);
        setErr(null);
        setLoading(false);
        return;
      }
      const [board, perps, latest] = await Promise.allSettled([
        fetchMarketBoard("monad"),
        fetchPerplMarkets(),
        fetchPriceLatest(symbol),
      ]);
      if (latest.status === "fulfilled" && latest.value.price) setPrice(latest.value.price);
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
        if (p?.markPrice) setPrice((prev) => prev ?? p.markPrice);
      }
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load market");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const loadChart = useCallback(async () => {
    setChartLoading(true);
    try {
      if (USE_MOCK) {
        const hist = mockPriceHistory(symbol, tfCfg.resolution, tfCfg.bars);
        setBars(hist.bars as ChartPoint[]);
        setPrice(hist.last ?? null);
        setChartLoading(false);
        return;
      }
      const hist = await fetchPriceHistory(symbol, tfCfg.resolution, tfCfg.bars);
      const pts: ChartPoint[] = (hist.bars || []).map((b) => ({
        t: b.t,
        o: b.o,
        h: b.h,
        l: b.l,
        c: b.c,
        v: b.v,
      }));
      setBars(pts);
      if (hist.last != null) setPrice(hist.last);
    } catch {
      if (USE_MOCK) {
        const hist = mockPriceHistory(symbol, 1, 64);
        setBars(hist.bars as ChartPoint[]);
        setPrice(hist.last ?? null);
      }
    } finally {
      setChartLoading(false);
    }
  }, [symbol, tfCfg.resolution, tfCfg.bars]);

  // Seed instantly so chart never waits on network
  useEffect(() => {
    const seed = mockPriceHistory(symbol, 1, 72);
    setBars(seed.bars as ChartPoint[]);
    setPrice(seed.last ?? null);
    const p = mockPerplMarkets().markets.find((m) => m.symbol.toUpperCase() === symbol);
    if (p) setPerp(p);
  }, [symbol]);

  useEffect(() => {
    loadMeta();
    const id = setInterval(loadMeta, 5000);
    return () => clearInterval(id);
  }, [loadMeta]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  const stats = useMemo(() => {
    const highs = bars.map((b) => b.h ?? b.c);
    const lows = bars.map((b) => b.l ?? b.c);
    const first = bars[0]?.c;
    const last = bars[bars.length - 1]?.c ?? price;
    const chg =
      first && last ? ((last - first) / first) * 100 : (perp?.change24hPct ?? 0);
    return {
      high: highs.length ? Math.max(...highs) : null,
      low: lows.length ? Math.min(...lows) : null,
      changePct: chg,
      up: chg >= 0,
    };
  }, [bars, price, perp]);

  const mode: "perp" | "blitz" =
    kind === "perp"
      ? "perp"
      : kind === "blitz"
        ? "blitz"
        : perp
          ? "perp"
          : "blitz";

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
        body: `${blitz.symbol} ${side} ${amount} AUSD`,
        tone: "success",
      });
      loadMeta();
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
        body: `${side} ${perp.symbol} ${marginNum} AUSD`,
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
      <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
        <MockBanner />
        {/* Instrument strip */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={16} style={styles.back}>
            <Icon name="arrow-back" size={22} color={colors.ink} />
            <Text style={styles.backText}>Markets</Text>
          </Pressable>
          <TokenBadge symbol={symbol} size={36} />
          <View style={{ flex: 1 }}>
            <View style={styles.symRow}>
              <Text style={styles.symbol}>{symbol}</Text>
              <Text style={styles.pair}>/USD</Text>
              <View style={[styles.modePill, mode === "perp" ? styles.modePerp : styles.modeBlitz]}>
                <Text style={[styles.modePillText, mode === "perp" ? { color: colors.up } : { color: colors.brand }]}>
                  {mode === "perp" ? "PERP" : "60S"}
                </Text>
              </View>
            </View>
            <Text style={styles.chain}>MONAD TESTNET · PYTH</Text>
          </View>
          {loading ? <ActivityIndicator color={colors.brand} /> : null}
        </View>

        {/* Quote block */}
        <View style={styles.quote}>
          <View>
            <Text style={styles.quoteLabel}>LAST</Text>
            <Text style={styles.quotePrice}>{fmtUsd(price)}</Text>
          </View>
          <View style={styles.quoteRight}>
            <View style={[styles.chgPill, stats.up ? styles.chgUp : styles.chgDown]}>
              <Text style={[styles.chgText, { color: stats.up ? colors.up : colors.down }]}>
                {stats.up ? "+" : ""}
                {stats.changePct.toFixed(2)}%
              </Text>
            </View>
            <Text style={monoStyle(11, colors.muted)}>
              H {stats.high != null ? fmtUsd(stats.high) : "—"} · L{" "}
              {stats.low != null ? fmtUsd(stats.low) : "—"}
            </Text>
          </View>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => {
              setKind("blitz");
              Haptics.selectionAsync();
            }}
            style={[styles.modeBtn, mode === "blitz" && styles.modeBtnOn]}
          >
            <Icon name="flash" size={13} color={mode === "blitz" ? colors.brand : colors.muted} />
            <Text style={[styles.modeBtnText, mode === "blitz" && { color: colors.brand }]}>60S BLITZ</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setKind("perp");
              Haptics.selectionAsync();
            }}
            style={[styles.modeBtn, mode === "perp" && styles.modeBtnOn]}
          >
            <Icon name="trending-up" size={13} color={mode === "perp" ? colors.up : colors.muted} />
            <Text style={[styles.modeBtnText, mode === "perp" && { color: colors.up }]}>PERPL PERP</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{ paddingBottom: 36, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Timeframes */}
          <View style={styles.tfRow}>
            {TFS.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => {
                  setTf(t.key);
                  Haptics.selectionAsync();
                }}
                style={[styles.tfChip, tf === t.key && styles.tfChipOn]}
              >
                <Text style={[styles.tfText, tf === t.key && { color: colors.brand }]}>{t.key}</Text>
              </Pressable>
            ))}
            <Pressable onPress={loadChart} hitSlop={8} style={{ marginLeft: "auto" }}>
              <Text style={styles.tfRefresh}>Reload</Text>
            </Pressable>
          </View>

          {/* Chart — always mounted with seeded series */}
          <View>
            <PriceChart
              points={bars}
              width={CHART_W}
              height={CHART_H}
              symbol={symbol}
            />
            {chartLoading ? (
              <Text style={styles.chartLoading}>Updating {symbol} · {tf}…</Text>
            ) : null}
            {err ? <Text style={styles.err}>{err}</Text> : null}
          </View>

          {/* Market stats */}
          <View style={styles.statsCard}>
            {mode === "perp" && perp ? (
              <>
                <Stat label="MARK" value={fmtUsd(perp.markPrice)} />
                <Stat label="BID" value={fmtUsd(perp.bidPrice)} />
                <Stat label="ASK" value={fmtUsd(perp.askPrice)} />
                <Stat label="24H" value={`${perp.change24hPct >= 0 ? "+" : ""}${perp.change24hPct.toFixed(2)}%`} accent={perp.change24hPct >= 0 ? colors.up : colors.down} />
              </>
            ) : (
              <>
                <Stat label="STATUS" value={blitz?.status === "open" ? "OPEN" : (blitz?.status || "—").toUpperCase()} accent={blitzOpen ? colors.brand : colors.muted} />
                <Stat
                  label="TIME"
                  value={blitz?.status === "open" ? `${Math.ceil(blitz.timeRemaining || 0)}s` : "—"}
                />
                <Stat
                  label="UP"
                  value={blitz?.spot ? `${(Number(blitz.spot.yes) * 100).toFixed(0)}¢` : "—"}
                  accent={colors.up}
                />
                <Stat
                  label="DOWN"
                  value={blitz?.spot ? `${(Number(blitz.spot.no) * 100).toFixed(0)}¢` : "—"}
                  accent={colors.down}
                />
              </>
            )}
          </View>

          {/* Ticket */}
          <View style={styles.ticket}>
            <Text style={styles.ticketTitle}>
              {mode === "perp" ? "PERPL TICKET" : "60S TICKET"} · AUSD
            </Text>
            <Text style={styles.ticketSub}>
              {mode === "perp"
                ? `Leverage 2x · account must be linked · wallet ${user?.address ? user.address.slice(0, 8) + "…" : "—"}`
                : blitzOpen
                  ? `Round #${blitz?.roundId} · Pyth settle on Monad`
                  : "No open round — keeper needs MON gas to open the next series"}
            </Text>

            <View style={styles.sizeRow}>
              {SIZES.map((s) => (
                <AmountChip key={s} value={s} selected={amount === s} onPress={() => setAmount(s)} />
              ))}
              <Text style={monoStyle(12, colors.muted)}>AUSD</Text>
            </View>

            {mode === "blitz" ? (
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
            ) : (
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
            )}

            <Text style={styles.walletLine}>
              AUSD {me?.ausd ?? "—"} · MON {me?.mon ?? "—"}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statVal, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: "100%", paddingHorizontal: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  backText: {
    color: colors.ink,
    fontFamily: type.medium,
    fontSize: 13,
  },
  symRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  symbol: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 28,
    letterSpacing: 1,
  },
  pair: { color: colors.muted, fontFamily: type.data, fontSize: 12, marginTop: 4 },
  modePill: {
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  modePerp: { borderColor: "rgba(46,229,157,0.4)", backgroundColor: "rgba(46,229,157,0.1)" },
  modeBlitz: { borderColor: "rgba(214,255,63,0.35)", backgroundColor: colors.brandDim },
  modePillText: { fontFamily: type.data, fontSize: 10, letterSpacing: 0.8 },
  chain: { color: colors.muted, fontFamily: type.data, fontSize: 9, letterSpacing: 1 },
  quote: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  quoteLabel: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  quotePrice: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 34,
    fontVariant: ["tabular-nums"],
  },
  quoteRight: { alignItems: "flex-end", gap: 4 },
  chgPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chgUp: { backgroundColor: colors.upDim },
  chgDown: { backgroundColor: colors.downDim },
  chgText: { fontFamily: type.bold, fontSize: 13 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgElevated,
  },
  modeBtnOn: { borderColor: colors.lineStrong, backgroundColor: colors.bgCard },
  modeBtnText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 11,
    letterSpacing: 1,
  },
  tfRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tfChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgElevated,
  },
  tfChipOn: { borderColor: colors.brand, backgroundColor: colors.brandDim },
  tfText: { color: colors.muted, fontFamily: type.data, fontSize: 11 },
  tfRefresh: { color: colors.brand, fontFamily: type.medium, fontSize: 12 },
  chartShell: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(242,241,236,0.08)",
    backgroundColor: "#0E1014",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chartLoading: { color: colors.muted, fontFamily: type.body, fontSize: 11, marginTop: 6, textAlign: "center" },
  err: { color: colors.danger, fontFamily: type.body, fontSize: 12, marginTop: 6 },
  statsCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statLabel: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
    letterSpacing: 1,
  },
  statVal: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  ticket: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    padding: space.md,
    gap: 10,
  },
  ticketTitle: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 12,
    letterSpacing: 1.1,
  },
  ticketSub: { color: colors.muted, fontFamily: type.body, fontSize: 12, lineHeight: 17 },
  sizeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actions: { flexDirection: "row", gap: 10 },
  walletLine: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 11,
    textAlign: "center",
  },
});
