import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from "react-native";
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
import { MockBanner } from "@/src/components/MockBanner";
import { PriceChart } from "@/src/components/PriceChart";
import { AssetGlyph, Icon } from "@/src/components/Icon";
import { getSelectedMarket, setSelectedMarket } from "@/src/market/selection";
import { mockMarketBoard, mockPerplMarkets, mockSeries } from "@/src/mock/fixtures";
import { colors, monoStyle, radius, space, type } from "@/src/theme";

type FilterTab = "all" | "blitz" | "perps";
const { width: W } = Dimensions.get("window");

function MiniSparkline({ positive, symbol }: { positive: boolean; symbol?: string }) {
  const color = positive ? colors.up : colors.down;
  const heights = positive ? [8, 12, 9, 14, 11, 16, 18] : [16, 12, 14, 9, 11, 7, 5];
  return (
    <View style={styles.sparkContainer}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[
            styles.sparkBar,
            { height: h, backgroundColor: color, opacity: 0.45 + i * 0.08 },
          ]}
        />
      ))}
    </View>
  );
}

export default function MarketsScreen() {
  const insets = useSafeAreaInsets();
  const [board, setBoard] = useState<MarketBoard | null>(null);
  const [perplMarkets, setPerplMarkets] = useState<PerplMarket[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { USE_MOCK } = await import("@/src/config/chain");
      if (USE_MOCK) {
        setBoard(mockMarketBoard() as any);
        setPerplMarkets(mockPerplMarkets().markets as any);
        setErr(null);
        setLoading(false);
        return;
      }
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

  const openMarketDetail = (opts: {
    symbol: string;
    kind: "perp" | "blitz";
    pair?: string;
    label?: string;
    market?: string | null;
    roundId?: string | null;
  }) => {
    setSelectedMarket({
      symbol: opts.symbol,
      pair: opts.pair || `${opts.symbol}-USD`,
      label: opts.label || opts.symbol,
      market: opts.market,
      roundId: opts.roundId,
      chain: "monad",
      chainId: 10143,
    });
    Haptics.selectionAsync();
    router.push({
      pathname: "/(app)/market-detail",
      params: {
        symbol: opts.symbol,
        kind: opts.kind,
      },
    });
  };

  const openPerpTrade = (m: PerplMarket) => {
    openMarketDetail({
      symbol: m.symbol,
      kind: "perp",
      pair: `${m.symbol}-USD`,
      label: m.name,
    });
  };

  const openHunchTrade = (row: MarketBoardRow) => {
    openMarketDetail({
      symbol: row.symbol,
      kind: "blitz",
      pair: row.pair,
      label: row.label || row.pair,
      market: row.market,
      roundId: row.roundId,
    });
  };

  // Real Perpl / API markets only — empty until backend responds
  const displayPerps: PerplMarket[] = perplMarkets;

  const filteredPerps = displayPerps.filter((m) => {
    if (filter === "blitz") return false;
    if (!search) return true;
    return m.symbol.toLowerCase().includes(search.toLowerCase());
  });

  const hunchMarkets = (board?.markets ?? []).filter((h) => {
    if (filter === "perps") return false;
    if (!search) return true;
    return h.symbol.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Screen>
      <View
        style={[
          styles.wrap,
          { paddingTop: insets.top + 8 },
        ]}
      >
        {/* Top network status */}
        <View style={styles.topStatus}>
          <View style={styles.statusLeft}>
            <View style={styles.greenDot} />
            <Text style={styles.networkText}>MONAD TESTNET</Text>
          </View>
        </View>
        <MockBanner />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>MARKETS</Text>
          <Pressable onPress={load} hitSlop={12} style={styles.latencyBadge}>
            <Icon name="refresh" size={14} color={colors.muted} />
            <Text style={styles.latencyBadgeText}>REFRESH</Text>
          </Pressable>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search markets"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoCapitalize="characters"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => { setFilter("all"); Haptics.selectionAsync(); }}
            style={[styles.filterPill, filter === "all" && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
              ALL
            </Text>
          </Pressable>

          <Pressable
            onPress={() => { setFilter("blitz"); Haptics.selectionAsync(); }}
            style={[styles.filterPill, filter === "blitz" && styles.filterPillActive]}
          >
            <Icon name="flash" size={13} color={filter === "blitz" ? colors.brand : colors.muted} />
            <Text style={[styles.filterText, filter === "blitz" && styles.filterTextActive]}>
              60S BLITZ
            </Text>
          </Pressable>

          <Pressable
            onPress={() => { setFilter("perps"); Haptics.selectionAsync(); }}
            style={[styles.filterPill, filter === "perps" && styles.filterPillActive]}
          >
            <Icon name="trending-up" size={13} color={filter === "perps" ? colors.brand : colors.muted} />
            <Text style={[styles.filterText, filter === "perps" && styles.filterTextActive]}>
              PERPS 20X
            </Text>
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
          {/* HOT ON MONAD FEATURED BANNER */}
          {filter !== "blitz" && displayPerps.length > 0 && (
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroTagWrap}>
                  <Icon name="flame" size={14} color={colors.down} />
                  <Text style={styles.heroTag}>HOT ON MONAD</Text>
                  <Text style={styles.heroPair}>{displayPerps[0].symbol} / AUSD</Text>
                </View>
                <View style={styles.heroPerpBadge}>
                  <Text style={styles.heroPerpText}>PERP 20X</Text>
                </View>
              </View>

              <View style={styles.heroBody}>
                <View>
                  <Text style={styles.heroPrice}>$3.852</Text>
                  <Text style={styles.heroDelta}>+14.25% 24H</Text>
                </View>
                <View style={styles.heroTrend}>
                  <MiniSparkline positive={true} />
                </View>
                <Pressable
                  onPress={() => {
                    if (displayPerps[0]) openPerpTrade(displayPerps[0]);
                  }}
                  style={styles.heroTradeBtn}
                >
                  <Text style={styles.heroTradeText}>TRADE →</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Featured mini chart — tap opens BTC detail */}
          {(filter === "all" || filter === "perps") && (
            <Pressable
              onPress={() => openMarketDetail({ symbol: "BTC", kind: "perp", pair: "BTC-USD", label: "BTC / USD" })}
              style={styles.featuredChart}
            >
              <View style={styles.featuredHead}>
                <Text style={styles.featuredTitle}>BTC · LIVE CHART</Text>
                <Text style={monoStyle(11, colors.brand)}>OPEN →</Text>
              </View>
              <PriceChart points={mockSeries("BTC", 48)} width={W - 44} height={150} symbol="BTC" />
            </Pressable>
          )}

          {/* TABLE HEADERS */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableColHeader, { flex: 2 }]}>MARKET</Text>
            <Text style={[styles.tableColHeader, { flex: 1, textAlign: "center" }]}>TREND</Text>
            <Text style={[styles.tableColHeader, { flex: 2, textAlign: "right" }]}>PRICE</Text>
          </View>

          {/* MARKET ROWS */}
          <View style={styles.marketList}>
            {filteredPerps.length === 0 && hunchMarkets.length === 0 && !loading ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No live markets</Text>
                <Text style={styles.emptyBody}>
                  {err || "Start API + keeper, or Perpl testnet is unreachable."}
                </Text>
              </View>
            ) : null}
            {filteredPerps.map((m) => {
              const isMon = m.symbol === "MON";
              const isBtc = m.symbol === "BTC";
              const isSol = m.symbol === "SOL";
              const isPump = m.symbol === "PUMP";
              const iconBg = isMon ? "#836EF9" : isBtc ? "#F7931A" : isSol ? "#14F195" : "#FF007A";
              const isEth = m.symbol === "ETH";
              const iconGlyph = isMon ? "M" : isBtc ? "₿" : isEth ? "Ξ" : isSol ? "◎" : (m.symbol || "•").charAt(0);

              return (
                <Pressable
                  key={`perp-${m.id}`}
                  onPress={() => openPerpTrade(m)}
                  style={styles.marketRow}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.tokenIcon, { backgroundColor: iconBg }]}>
                      <Text style={styles.tokenGlyph}>{iconGlyph}</Text>
                    </View>
                    <View>
                      <View style={styles.pairWithBadge}>
                        <Text style={styles.pairTitle} numberOfLines={1}>{m.symbol}</Text>
                        <Text style={styles.pairSlash}>/AUSD</Text>
                        <View style={styles.levBadge}>
                          <Text style={styles.levBadgeText}>{m.maxLeverage}X</Text>
                        </View>
                      </View>
                      <Text style={styles.volSub} numberOfLines={1}>
                        Vol ${(m.volume24hAUSD / 1000).toFixed(0)}k · 20x max
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rowMid}>
                    <MiniSparkline positive={m.change24hPct >= 0} />
                  </View>

                  <View style={styles.rowRight}>
                    <Text style={styles.priceNum} numberOfLines={1}>
                      ${m.markPrice >= 1000
                        ? m.markPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                        : m.markPrice >= 1
                          ? m.markPrice.toFixed(3)
                          : m.markPrice.toFixed(5)}
                    </Text>
                    <Text style={[styles.deltaNum, m.change24hPct >= 0 ? styles.posColor : styles.negColor]}>
                      {m.change24hPct >= 0 ? "+" : ""}{m.change24hPct.toFixed(2)}%
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {/* All 60s blitz markets from API board (BTC/ETH/SOL…) */}
            {(filter === "all" || filter === "blitz") &&
              hunchMarkets.map((row) => {
                const iconBg =
                  row.symbol === "BTC" ? "#F7931A" : row.symbol === "ETH" ? "#627EEA" : row.symbol === "SOL" ? "#14F195" : "#836EF9";
                const glyph = row.symbol === "BTC" ? "₿" : row.symbol === "ETH" ? "Ξ" : row.symbol === "SOL" ? "◎" : row.symbol.charAt(0);
                const yesC = row.spot ? Number(row.spot.yes) * 100 : null;
                return (
                  <Pressable
                    key={`blitz-${row.chain}-${row.symbol}`}
                    onPress={() => openHunchTrade(row)}
                    style={styles.marketRow}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.tokenIcon, { backgroundColor: iconBg }]}>
                        <Text style={styles.tokenGlyph}>{glyph}</Text>
                      </View>
                      <View>
                        <View style={styles.pairWithBadge}>
                          <Text style={styles.pairTitle}>{row.symbol}</Text>
                          <Text style={styles.pairSlash}>/AUSD</Text>
                          <View style={[styles.levBadge, { backgroundColor: "rgba(214,255,63,0.18)" }]}>
                            <Text style={[styles.levBadgeText, { color: colors.brand }]}>60S</Text>
                          </View>
                        </View>
                        <Text style={styles.volSub} numberOfLines={1}>
                          {row.status === "open"
                            ? `${Math.ceil(row.timeRemaining || 0)}s left · UP/DOWN`
                            : row.reason || row.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.rowMid}>
                      <MiniSparkline positive={yesC == null || yesC >= 50} />
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={styles.priceNum}>
                        {yesC != null ? `${yesC.toFixed(0)}¢` : row.status.toUpperCase()}
                      </Text>
                      <Text style={[styles.deltaNum, row.status === "open" ? styles.posColor : styles.negColor]}>
                        {row.status === "open" ? "LIVE" : row.status}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
          </View>

          {/* FOOTER: Pyth Oracle Engine status */}
          <View style={styles.oracleFooter}>
            <View style={styles.oracleLeft}>
              <View style={styles.greenDot} />
              <Text style={styles.oracleText}>Pyth · Monad testnet</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    paddingHorizontal: 14,
    paddingBottom: 0,
    backgroundColor: "#0A0B0D",
  },
  topStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.up,
  },
  networkText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  featuredChart: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.sm,
    backgroundColor: colors.bgCard,
    gap: 8,
  },
  featuredHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredTitle: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 11,
    letterSpacing: 1,
  },
  pipe: {
    color: "#333742",
    fontSize: 10,
  },
  tpsText: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 10,
  },
  latencyText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161922",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    gap: 4,
    borderWidth: 1,
    borderColor: "#20242D",
  },
  balanceA: {
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
  balanceVal: {
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
    marginLeft: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: colors.ink,
    fontFamily: type.display.fontFamily,
    fontSize: 28,
    letterSpacing: 1.2,
  },
  hyperexecBadge: {
    backgroundColor: "rgba(214,255,63,0.12)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(214,255,63,0.3)",
  },
  hyperexecText: {
    color: colors.brand,
    fontSize: 9,
    fontFamily: type.bold,
    letterSpacing: 0.6,
  },
  latencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#14171E",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  refreshIcon: {
    color: colors.muted,
    fontSize: 12,
  },
  latencyBadgeText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12141A",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    fontFamily: type.body,
    padding: 0,
  },
  cmdKBadge: {
    backgroundColor: "#1A1E27",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  cmdKText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#12141A",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#1E222D",
  },
  filterPillActive: {
    backgroundColor: "#161B16",
    borderColor: colors.brand,
  },
  filterText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  filterTextActive: {
    color: colors.brand,
  },
  activePillDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  heroCard: {
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  heroTagWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fireIcon: {
    fontSize: 12,
  },
  heroTag: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  heroPair: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 12,
  },
  heroPerpBadge: {
    backgroundColor: "#1C202B",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  heroPerpText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
  },
  heroBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroPrice: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 22,
    fontWeight: "700",
  },
  heroDelta: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  heroTrend: {
    paddingHorizontal: 12,
  },
  heroTradeBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  heroTradeText: {
    color: "#000000",
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginTop: 6,
  },
  tableColHeader: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  marketList: {
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  emptyBox: {
    padding: 20,
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  emptyTitle: { color: colors.ink, fontFamily: type.bold, fontSize: 16 },
  emptyBody: { color: colors.muted, fontFamily: type.body, fontSize: 13, lineHeight: 18 },
  marketRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#181C26",
  },
  rowLeft: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenGlyph: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  pairWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pairTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 13,
  },
  pairSlash: {
    color: colors.muted,
    fontSize: 11,
  },
  levBadge: {
    backgroundColor: "#1F2330",
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  levBadgeText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "600",
  },
  volSub: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    marginTop: 2,
  },
  rowMid: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowRight: {
    flex: 2,
    alignItems: "flex-end",
  },
  priceNum: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 14,
    fontWeight: "700",
  },
  deltaNum: {
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  posColor: {
    color: colors.up,
  },
  negColor: {
    color: colors.down,
  },
  sparkContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 20,
  },
  sparkBar: {
    width: 3,
    borderRadius: 1,
  },
  oracleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6,
    marginTop: 4,
  },
  oracleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  oracleText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
  },
  epochText: {
    color: "#4E5467",
    fontFamily: type.data,
    fontSize: 10,
  },
});
