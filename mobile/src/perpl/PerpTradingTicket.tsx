import { useState, useMemo } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/src/auth/AuthContext";
import { useWallet } from "@/src/wallet/WalletContext";
import { useToast } from "@/src/components/Toast";
import { usePerplMarkets, placePerplOrder, PerplMarket } from "./perplClient";
import { Icon } from "@/src/components/Icon";
import { colors, radius, space, type, monoStyle } from "@/src/theme";

const LEVERAGE_OPTIONS = [2, 5, 10, 20] as const;
const MARGIN_CHIPS = ["25", "50", "100", "500"] as const;

function MiniWaveChart() {
  return (
    <View style={styles.chartContainer}>
      <View style={styles.waveGraphic}>
        <View style={[styles.waveDot, { bottom: 12, left: 10 }]} />
        <View style={[styles.waveDot, { bottom: 24, left: 50 }]} />
        <View style={[styles.waveDot, { bottom: 18, left: 90 }]} />
        <View style={[styles.waveDot, { bottom: 40, left: 140 }]} />
        <View style={[styles.waveDot, { bottom: 32, left: 190 }]} />
        <View style={[styles.waveDot, { bottom: 58, left: 240 }]} />
        <View style={[styles.waveDot, { bottom: 50, left: 280 }]} />
        <View style={[styles.peakDot, { bottom: 70, right: 14 }]} />
        <View style={styles.waveFillOverlay} />
      </View>
    </View>
  );
}

export function PerpTradingTicket() {
  const { user } = useAuth();
  const { me, refresh: refreshWallet } = useWallet();
  const toast = useToast();
  const { markets, loading: marketsLoading, refresh: refreshMarkets } = usePerplMarkets(4000);

  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [leverage, setLeverage] = useState<number>(10);
  const [marginAUSD, setMarginAUSD] = useState<string>("50");
  const [submitting, setSubmitting] = useState(false);

  const activeMarket = useMemo(() => {
    return markets.find((m) => m.symbol.toUpperCase() === selectedSymbol.toUpperCase()) || markets[0];
  }, [markets, selectedSymbol]);

  const marginNum = parseFloat(marginAUSD) || 0;
  const positionSizeAUSD = marginNum * leverage;
  const currentPrice = activeMarket ? activeMarket.markPrice : 78240;

  // Est Liquidation price
  const estLiqPrice = useMemo(() => {
    if (!currentPrice || leverage <= 0) return 70416;
    const dropFraction = 1 / leverage - 0.05;
    return side === "LONG"
      ? Math.max(0, currentPrice * (1 - dropFraction))
      : currentPrice * (1 + dropFraction);
  }, [currentPrice, leverage, side]);

  const handleTrade = async () => {
    if (!activeMarket) return;
    if (marginNum < 5) {
      toast.error("Margin too small", "Minimum margin is 5 AUSD.");
      return;
    }

    const userAddress = user?.address || me?.address || "";

    setSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await placePerplOrder({
        trader: userAddress,
        symbol: activeMarket.symbol,
        side,
        marginAUSD: marginNum,
        leverage,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show("Order Executed", {
        body: `${side} ${activeMarket.symbol} · ${leverage}x ($${positionSizeAUSD.toLocaleString()} AUSD)`,
        tone: "success",
      });

      refreshWallet();
      refreshMarkets();
    } catch (e: any) {
      toast.error("Order Failed", e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const displayMarkets: PerplMarket[] = markets.length
    ? markets
    : [
        { id: 16, perpetualId: 16, symbol: "BTC", name: "BTC-PERP", sizeUnits: "BTC", markPrice: 78240.0, lastPrice: 78240, bidPrice: 78235, askPrice: 78245, change24hPct: 2.45, volume24hAUSD: 3980000, openInterest: 17.75, fundingRateBps: 4, maxLeverage: 10, priceDecimals: 2, sizeDecimals: 4 },
        { id: 32, perpetualId: 32, symbol: "ETH", name: "ETH-PERP", sizeUnits: "ETH", markPrice: 2513.5, lastPrice: 2513, bidPrice: 2512, askPrice: 2514, change24hPct: 3.2, volume24hAUSD: 1840000, openInterest: 210, fundingRateBps: 3, maxLeverage: 20, priceDecimals: 2, sizeDecimals: 3 },
        { id: 48, perpetualId: 48, symbol: "SOL", name: "SOL-PERP", sizeUnits: "SOL", markPrice: 182.4, lastPrice: 182, bidPrice: 182, askPrice: 183, change24hPct: 5.9, volume24hAUSD: 890000, openInterest: 1200, fundingRateBps: 5, maxLeverage: 20, priceDecimals: 2, sizeDecimals: 2 },
      ];

  const currentMark = activeMarket || displayMarkets[0];
  const availBalance = me?.ausd != null ? Number(me.ausd).toFixed(2) : "—";

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Ticker Selector Strip */}
      <View style={styles.tickerStrip}>
        {displayMarkets.map((m) => {
          const isSel = currentMark.symbol === m.symbol;
          return (
            <Pressable
              key={m.symbol}
              onPress={() => {
                setSelectedSymbol(m.symbol);
                Haptics.selectionAsync();
              }}
              style={[styles.stripPill, isSel && styles.stripPillActive]}
            >
              <Text style={[styles.stripSymbol, isSel && styles.stripSymbolActive]}>
                {m.symbol}
              </Text>
              <Text style={styles.stripPrice}>
                ${m.markPrice >= 1000 ? m.markPrice.toLocaleString(undefined, { maximumFractionDigits: 0 }) : m.markPrice.toFixed(2)}
              </Text>
              <Text style={styles.stripDelta} numberOfLines={1}>
                {m.change24hPct >= 0 ? "+" : ""}
                {m.change24hPct}%
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Hero Chart & Price Card */}
      <View style={styles.heroMarketCard}>
        <View style={styles.heroMarketTop}>
          <View style={styles.marketTitleWrap}>
            <Text style={styles.marketTitleText}>{currentMark.symbol}-PERP</Text>
            <View style={styles.maxLevBadge}>
              <Text style={styles.maxLevText}>{currentMark.maxLeverage}X MAX</Text>
            </View>
          </View>
          <View style={styles.subSecondBadge}>
            <Text style={styles.subSecondText}>PERP</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.bigPrice}>
            ${currentMark.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.bigDelta}>+{currentMark.change24hPct}%</Text>
          <Text style={styles.pythFeedText}>Pyth · Monad</Text>
        </View>

        {/* Wave area graphic */}
        <MiniWaveChart />

        {/* 3 Stats Columns */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statColLabel}>VOLUME 24H</Text>
            <Text style={styles.statColVal}>${(currentMark.volume24hAUSD / 1000000).toFixed(2)}M</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statColLabel}>1H FUNDING</Text>
            <Text style={[styles.statColVal, { color: colors.up }]}>
            {(currentMark.fundingRateBps / 10000).toFixed(4)}%
          </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statColLabel}>OPEN INTEREST</Text>
            <Text style={styles.statColVal}>{currentMark.openInterest} {currentMark.symbol}</Text>
          </View>
        </View>
      </View>

      {/* Buy/Long vs Sell/Short Dual Buttons */}
      <View style={styles.sideToggleRow}>
        <Pressable
          onPress={() => { setSide("LONG"); Haptics.selectionAsync(); }}
          style={[styles.sideBtn, side === "LONG" ? styles.sideLongActive : styles.sideIdle]}
        >
          <Text style={[styles.sideBtnText, side === "LONG" ? styles.sideLongTextActive : styles.sideIdleText]}>
            ↑ BUY / LONG
          </Text>
        </Pressable>

        <Pressable
          onPress={() => { setSide("SHORT"); Haptics.selectionAsync(); }}
          style={[styles.sideBtn, side === "SHORT" ? styles.sideShortActive : styles.sideIdle]}
        >
          <Text style={[styles.sideBtnText, side === "SHORT" ? styles.sideShortTextActive : styles.sideIdleText]}>
            ↓ SELL / SHORT
          </Text>
        </Pressable>
      </View>

      {/* Leverage Multiplier Section */}
      <View style={styles.formSection}>
        <View style={styles.formSectionHeader}>
          <Text style={styles.formSectionTitle}>LEVERAGE MULTIPLIER</Text>
          <Text style={styles.formSectionHighlight}>{leverage}x</Text>
        </View>
        <View style={styles.levRow}>
          {LEVERAGE_OPTIONS.map((lev) => (
            <Pressable
              key={lev}
              onPress={() => { setLeverage(lev); Haptics.selectionAsync(); }}
              style={[styles.levChip, leverage === lev && styles.levChipActive]}
            >
              <Text style={[styles.levChipText, leverage === lev && styles.levChipTextActive]}>
                {lev}x
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Collateral Amount Input Section */}
      <View style={styles.formSection}>
        <View style={styles.formSectionHeader}>
          <Text style={styles.formSectionTitle}>COLLATERAL AMOUNT</Text>
          <Text style={styles.formSectionAvail}>AVAIL: {availBalance} AUSD</Text>
        </View>

        <View style={styles.inputCard}>
          <TextInput
            value={marginAUSD}
            onChangeText={setMarginAUSD}
            keyboardType="numeric"
            style={styles.textInput}
            placeholder="50.00"
            placeholderTextColor={colors.muted}
          />
          <View style={styles.inputRightWrap}>
            <Pressable
              onPress={() => setMarginAUSD("250")}
              style={styles.maxChip}
            >
              <Text style={styles.maxChipText}>MAX</Text>
            </Pressable>
            <Text style={styles.ausdSuffix}>AUSD</Text>
          </View>
        </View>

        {/* Quick Amount Chips */}
        <View style={styles.amountChipsRow}>
          {MARGIN_CHIPS.map((chip) => (
            <Pressable
              key={chip}
              onPress={() => { setMarginAUSD(chip); Haptics.selectionAsync(); }}
              style={[styles.amountChip, marginAUSD === chip && styles.amountChipActive]}
            >
              <Text style={[styles.amountChipText, marginAUSD === chip && styles.amountChipTextActive]}>
                ${chip}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Order Execution Specs Summary */}
      <View style={styles.specsCard}>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>POSITION SIZE ({leverage}x)</Text>
          <Text style={styles.specVal}>${positionSizeAUSD.toFixed(2)} AUSD</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>EST. LIQUIDATION PRICE</Text>
          <Text style={[styles.specVal, { color: colors.down }]}>
            ${estLiqPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} (-10.0%)
          </Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>FEES</Text>
          <Text style={styles.specVal} numberOfLines={1}>Exchange + gas</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>FINALITY</Text>
          <View style={styles.finalityRow}>
            <View style={styles.greenDot} />
            <Text style={styles.finalityText} numberOfLines={1}>Fast · Monad</Text>
          </View>
        </View>
      </View>

      {/* BIG PRIMARY OPEN ACTION CTA */}
      <Pressable
        onPress={handleTrade}
        disabled={submitting}
        style={styles.mainActionBtn}
      >
        {submitting ? (
          <ActivityIndicator color="#000" />
        ) : (
          <>
            <Icon name="flash" size={16} color={colors.brand} />
            <Text style={styles.mainActionText}>
              OPEN {side} {currentMark.symbol} ({leverage}X)
            </Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 12,
  },
  tickerStrip: {
    flexDirection: "row",
    gap: 8,
  },
  stripPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#12141A",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  stripPillActive: {
    borderColor: colors.brand,
    backgroundColor: "#161B16",
  },
  stripSymbol: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 11,
  },
  stripSymbolActive: {
    color: colors.brand,
  },
  stripPrice: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "bold",
  },
  stripDelta: {
    fontFamily: type.data,
    fontSize: 10,
  },
  posColor: {
    color: colors.up,
  },
  negColor: {
    color: colors.down,
  },
  heroMarketCard: {
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  heroMarketTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  marketTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  marketTitleText: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  maxLevBadge: {
    backgroundColor: "#1D212C",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  maxLevText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "bold",
  },
  subSecondBadge: {
    backgroundColor: "rgba(46,229,157,0.1)",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  subSecondText: {
    color: colors.up,
    fontFamily: type.bold,
    fontSize: 9,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 8,
  },
  bigPrice: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 28,
    fontWeight: "800",
  },
  bigDelta: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 13,
    fontWeight: "bold",
  },
  pythFeedText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    marginLeft: "auto",
  },
  chartContainer: {
    height: 90,
    marginVertical: 10,
    justifyContent: "flex-end",
    position: "relative",
  },
  waveGraphic: {
    height: 80,
    width: "100%",
    backgroundColor: "rgba(214,255,63,0.03)",
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(214,255,63,0.2)",
    position: "relative",
  },
  waveDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
    opacity: 0.8,
  },
  peakDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  waveFillOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 35,
    backgroundColor: "rgba(214,255,63,0.06)",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#1C202B",
    paddingTop: 10,
  },
  statCol: {
    gap: 2,
  },
  statColLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  statColVal: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 12,
    fontWeight: "bold",
  },
  sideToggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  sideBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sideLongActive: {
    backgroundColor: colors.up,
  },
  sideShortActive: {
    backgroundColor: colors.down,
  },
  sideIdle: {
    backgroundColor: "#12141A",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sideBtnText: {
    fontFamily: type.bold,
    fontSize: 13,
    letterSpacing: 0.8,
  },
  sideLongTextActive: {
    color: "#000000",
  },
  sideShortTextActive: {
    color: "#FFFFFF",
  },
  sideIdleText: {
    color: colors.muted,
  },
  formSection: {
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  formSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formSectionTitle: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  formSectionHighlight: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 12,
    fontWeight: "bold",
  },
  formSectionAvail: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
  },
  levRow: {
    flexDirection: "row",
    gap: 8,
  },
  levChip: {
    flex: 1,
    backgroundColor: "#191D26",
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
  },
  levChipActive: {
    backgroundColor: colors.brand,
  },
  levChipText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 12,
    fontWeight: "bold",
  },
  levChipTextActive: {
    color: "#000000",
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D0F14",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 22,
    fontWeight: "800",
    padding: 0,
  },
  inputRightWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  maxChip: {
    backgroundColor: "#1C212E",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  maxChipText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 10,
  },
  ausdSuffix: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 12,
  },
  amountChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  amountChip: {
    flex: 1,
    backgroundColor: "#171B24",
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: "center",
  },
  amountChipActive: {
    backgroundColor: "rgba(214,255,63,0.2)",
    borderWidth: 1,
    borderColor: colors.brand,
  },
  amountChipText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 12,
    fontWeight: "600",
  },
  amountChipTextActive: {
    color: colors.brand,
  },
  specsCard: {
    backgroundColor: "#0D0F14",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  specLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  specVal: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "bold",
  },
  finalityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.up,
  },
  finalityText: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "bold",
  },
  mainActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: radius.pill,
    gap: 8,
  },
  boltActionIcon: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
  mainActionText: {
    color: "#000000",
    fontFamily: type.bold,
    fontSize: 14,
    letterSpacing: 0.8,
  },
});
