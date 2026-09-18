import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMarketBoard, type MarketBoard, type MarketBoardRow } from "@/src/api/client";
import { Screen } from "@/src/components/Screen";
import { EmptyState } from "@/src/components/ui";
import { getSelectedMarket, setSelectedMarket } from "@/src/market/selection";
import { colors, monoStyle, radius, space, type } from "@/src/theme";

function statusTone(status: MarketBoardRow["status"]) {
  if (status === "open") return colors.brand;
  if (status === "resolved") return colors.muted;
  return colors.muted;
}

export default function MarketsScreen() {
  const insets = useSafeAreaInsets();
  const [board, setBoard] = useState<MarketBoard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [chainFilter, setChainFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const b = await fetchMarketBoard(chainFilter);
      setBoard(b);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "board failed");
    } finally {
      setLoading(false);
    }
  }, [chainFilter]);

  useEffect(() => {
    load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openTrade = (row: MarketBoardRow) => {
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

  const selected = getSelectedMarket();
  const filters = ["all", ...(board?.chains?.map((c) => c.key) ?? ["monad", "base"])];

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>MARKETS</Text>
            <Text style={styles.sub}>Short-horizon UP/DOWN · multichain settlement</Text>
          </View>
          <Pressable onPress={load} hitSlop={12}>
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.chips}>
          {filters.map((f) => (
            <Pressable
              key={f}
              onPress={() => setChainFilter(f === "all" ? undefined : f)}
              style={[styles.chip, (chainFilter ?? "all") === f && styles.chipOn]}
            >
              <Text style={[styles.chipText, (chainFilter ?? "all") === f && styles.chipTextOn]}>
                {f.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {board?.chains?.length ? (
          <Text style={styles.settle}>
            {board.chains
              .map((c) => `${c.name}${c.settlementHub ? " ★" : ""}${c.deployed === false ? " (pending)" : ""}`)
              .join("  ·  ")}
          </Text>
        ) : null}

        {err ? <Text style={styles.error}>{err}</Text> : null}

        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {!loading && (!board?.markets?.length) ? (
            <EmptyState
              glyph="↑ UP   ↓ DOWN"
              title="No markets"
              body="Keeper is opening rounds on Monad. Pull to refresh in a few seconds."
            />
          ) : (
            (board?.markets ?? []).map((row) => {
              const isSel =
                selected.symbol === row.symbol &&
                selected.chain === row.chain &&
                selected.roundId === row.roundId;
              return (
                <Pressable
                  key={`${row.chain}-${row.symbol}-${row.roundId ?? "x"}`}
                  onPress={() => openTrade(row)}
                  style={[styles.row, isSel && styles.rowSel, row.status !== "open" && styles.rowMuted]}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.symbol}>{row.symbol}</Text>
                    <Text style={[styles.pair, monoStyle(11, colors.muted)]}>
                      {row.chain.toUpperCase()}
                      {row.settlementHub ? " ★" : row.chain === "base" ? "" : ""}
                    </Text>
                  </View>
                  <View style={styles.rowMid}>
                    <Text style={[styles.count, monoStyle(14, row.status === "open" ? colors.brand : colors.muted)]}>
                      {row.status === "open" && row.timeRemaining != null
                        ? `${Math.ceil(row.timeRemaining)}s`
                        : row.status === "unavailable"
                          ? "PENDING"
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
                  <Text style={[styles.go, { color: statusTone(row.status) }]}>
                    {row.status === "open" ? "TRADE" : "→"}
                  </Text>
                </Pressable>
              );
            })
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
    fontSize: 48,
    letterSpacing: 1,
  },
  sub: { color: colors.muted, fontFamily: type.body, fontSize: 13 },
  refresh: { color: colors.muted, fontFamily: type.medium, fontSize: 13, marginTop: 12 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
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
  settle: { color: colors.muted, fontFamily: type.data, fontSize: 11 },
  error: { color: colors.danger, fontFamily: type.body, fontSize: 13 },
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
  rowMuted: { opacity: 0.75 },
  rowLeft: { width: 88, gap: 2 },
  symbol: { color: colors.ink, fontFamily: type.bold, fontSize: 20 },
  pair: { color: colors.muted, fontFamily: type.body, fontSize: 11 },
  rowMid: { flex: 1, gap: 2 },
  count: { color: colors.brand, fontFamily: type.bold, fontSize: 14 },
  odds: { color: colors.muted, fontFamily: type.medium, fontSize: 12 },
  go: { fontFamily: type.bold, fontSize: 12, letterSpacing: 0.6 },
});
