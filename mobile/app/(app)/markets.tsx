import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  fetchMarketBoard,
  fetchPerplMarkets,
  type MarketBoard,
  type MarketBoardRow,
  type PerplMarket,
} from "@/src/api/client";
import { Screen } from "@/src/components/Screen";
import { EmptyState } from "@/src/components/ui";
import { getSelectedMarket, setSelectedMarket } from "@/src/market/selection";
import { colors, monoStyle, radius, space, type } from "@/src/theme";

type MarketTab = "all" | "perps" | "hunch";

export default function MarketsScreen() {
  const insets = useSafeAreaInsets();
  const [board, setBoard] = useState<MarketBoard | null>(null);
  const [perplMarkets, setPerplMarkets] = useState<PerplMarket[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<MarketTab>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [b, p] = await Promise.allSettled([
        fetchMarketBoard("monad"),
        fetchPerplMarkets(),
      ]);

      if (b.status === "fulfilled") setBoard(b.value);
      if (p.status === "fulfilled") setPerplMarkets(p.value.markets);
      setErr(null);
    } catch (e: any) {
      setErr(e.message || "Failed to load markets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openHunchTrade = (row: MarketBoardRow) => {
    setSelectedMarket({
      symbol: row.symbol,
      pair: row.pair,
      label: row.label || row.pair,
      market: row.market,
      roundId: row.roundId,
      chain: row.chain,
      chainId: row.chainId,
    });
    router.push("/(app)");
  };

  const openPerpTrade = (m: PerplMarket) => {
    setSelectedMarket({
      symbol: m.symbol,
      pair: `${m.symbol}-USD`,
      label: m.name,
      chain: "monad",
      chainId: 10143,
    });
    router.push("/(app)");
  };

  const selected = getSelectedMarket();

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>MARKETS</Text>
            <Text style={styles.sub}>Perpetual Futures & 60s Hunches on Monad</Text>
          </View>
          <Pressable onPress={load} hitSlop={12}>
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        </View>

        {/* Category Tabs */}
        <View style={styles.chips}>
          {(["all", "perps", "hunch"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setTab(t);
                Haptics.selectionAsync();
              }}
              style={[styles.chip, tab === t && styles.chipOn]}
            >
              <Text style={[styles.chipText, tab === t && styles.chipTextOn]}>
                {t === "all" ? "ALL INSTRUMENTS" : t === "perps" ? "📈 PERPETUALS (PERPL)" : "⚡ 60s HUNCHES"}
              </Text>
            </Pressable>
          ))}
        </View>

        {err ? <Text style={styles.error}>{err}</Text> : null}

        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          {/* SECTION 1: PERPETUAL FUTURES */}
          {(tab === "all" || tab === "perps") && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PERPETUAL FUTURES (PERPL DEX)</Text>
                <Text style={styles.sectionBadge}>AUSD Margin</Text>
              </View>

              {loading && !perplMarkets.length ? (
                <ActivityIndicator color={colors.brand} />
              ) : perplMarkets.map((m) => (
                <Pressable
                  key={`perp-${m.id}`}
                  onPress={() => openPerpTrade(m)}
                  style={styles.perpCard}
                >
                  <View style={styles.perpLeft}>
                    <Text style={styles.symbol}>{m.symbol}</Text>
                    <Text style={[styles.pair, monoStyle(11, colors.muted)]}>
                      {m.name} · {m.maxLeverage}x
                    </Text>
                  </View>

                  <View style={styles.perpMid}>
                    <Text style={[styles.priceText, monoStyle(15, colors.ink)]}>
                      ${m.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                    <Text style={[styles.volText, monoStyle(11, colors.muted)]}>
                      Vol ${(m.volume24hAUSD / 1000).toFixed(0)}k · {m.fundingRateBps} bps
                    </Text>
                  </View>

                  <View style={styles.perpRight}>
                    <View
                      style={[
                        styles.deltaBadge,
                        m.change24hPct >= 0 ? styles.deltaPos : styles.deltaNeg,
                      ]}
                    >
                      <Text
                        style={[
                          styles.deltaText,
                          m.change24hPct >= 0 ? styles.posColor : styles.negColor,
                        ]}
                      >
                        {m.change24hPct >= 0 ? "+" : ""}
                        {m.change24hPct}%
                      </Text>
                    </View>
                    <Text style={styles.tradeLink}>TRADE</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* SECTION 2: 60s HUNCHES */}
          {(tab === "all" || tab === "hunch") && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>60-SECOND HUNCHE MARKETS (PYTH CPMM)</Text>
                <Text style={styles.sectionBadge}>Binary Options</Text>
              </View>

              {!loading && !board?.markets?.length ? (
                <EmptyState
                  glyph="↑ UP   ↓ DOWN"
                  title="No live hunches"
                  body="Keeper is opening new 60-second markets on Monad."
                />
              ) : (
                (board?.markets ?? []).map((row) => {
                  const isSel = selected.symbol === row.symbol && selected.roundId === row.roundId;
                  return (
                    <Pressable
                      key={`${row.chain}-${row.symbol}-${row.roundId ?? "x"}`}
                      onPress={() => openHunchTrade(row)}
                      style={[styles.row, isSel && styles.rowSel]}
                    >
                      <View style={styles.rowLeft}>
                        <Text style={styles.symbol}>{row.symbol}</Text>
                        <Text style={[styles.pair, monoStyle(11, colors.muted)]}>
                          {row.chain.toUpperCase()} · 60s
                        </Text>
                      </View>

                      <View style={styles.rowMid}>
                        <Text
                          style={[
                            styles.count,
                            monoStyle(14, row.status === "open" ? colors.brand : colors.muted),
                          ]}
                        >
                          {row.status === "open" && row.timeRemaining != null
                            ? `⏱ ${Math.ceil(row.timeRemaining)}s left`
                            : row.status.toUpperCase()}
                        </Text>
                        {row.spot ? (
                          <Text style={monoStyle(12, colors.muted)}>
                            UP {(Number(row.spot.yes) * 100).toFixed(0)}¢ · DOWN{" "}
                            {(Number(row.spot.no) * 100).toFixed(0)}¢
                          </Text>
                        ) : (
                          <Text style={monoStyle(12, colors.muted)}>{row.reason || "—"}</Text>
                        )}
                      </View>

                      <Text style={[styles.go, { color: colors.brand }]}>
                        SWIPE →
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.lg, gap: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 44,
    letterSpacing: 1,
  },
  sub: { color: colors.muted, fontFamily: type.body, fontSize: 13 },
  refresh: { color: colors.muted, fontFamily: type.medium, fontSize: 13, marginTop: 12 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginVertical: 4 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: colors.brandDim, borderColor: colors.brand },
  chipText: { color: colors.muted, fontFamily: type.bold, fontSize: 11, letterSpacing: 0.8 },
  chipTextOn: { color: colors.brand },
  error: { color: colors.danger, fontFamily: type.body, fontSize: 13 },
  sectionWrap: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  sectionTitle: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  sectionBadge: {
    color: colors.brand,
    fontFamily: type.body,
    fontSize: 10,
  },
  perpCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.md,
    backgroundColor: colors.bgElevated,
    justifyContent: "space-between",
  },
  perpLeft: { width: 90 },
  perpMid: { flex: 1, paddingHorizontal: 8 },
  perpRight: { alignItems: "flex-end", gap: 4 },
  priceText: { fontWeight: "700" },
  volText: { marginTop: 2 },
  deltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  deltaPos: { backgroundColor: colors.upDim },
  deltaNeg: { backgroundColor: colors.downDim },
  deltaText: { fontFamily: type.bold, fontSize: 12 },
  posColor: { color: colors.up },
  negColor: { color: colors.down },
  tradeLink: { color: colors.brand, fontFamily: type.bold, fontSize: 11, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.md,
    backgroundColor: colors.bgElevated,
  },
  rowSel: { borderColor: colors.brand },
  rowLeft: { width: 88, gap: 2 },
  symbol: { color: colors.ink, fontFamily: type.bold, fontSize: 20 },
  pair: { color: colors.muted, fontFamily: type.body, fontSize: 11 },
  rowMid: { flex: 1, gap: 2 },
  count: { color: colors.brand, fontFamily: type.bold, fontSize: 14 },
  go: { fontFamily: type.bold, fontSize: 12, letterSpacing: 0.6 },
});
