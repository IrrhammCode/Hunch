import { useState, useMemo } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/src/auth/AuthContext";
import { useWallet } from "@/src/wallet/WalletContext";
import { useToast } from "@/src/components/Toast";
import { usePerplMarkets, placePerplOrder, PerplMarket } from "./perplClient";
import { colors, radius, space, type } from "@/src/theme";

const LEVERAGE_OPTIONS = [2, 5, 10, 20] as const;
const MARGIN_CHIPS = ["25", "50", "100", "250"] as const;

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
  const currentPrice = activeMarket ? activeMarket.markPrice : 0;
  const positionSizeUnits = currentPrice > 0 ? (positionSizeAUSD / currentPrice).toFixed(activeMarket?.sizeDecimals || 4) : "0";

  // Liquidation calculation (approx 80% margin maintenance)
  const estLiqPrice = useMemo(() => {
    if (!currentPrice || leverage <= 0) return 0;
    const dropFraction = 1 / leverage - 0.05;
    return side === "LONG"
      ? Math.max(0, currentPrice * (1 - dropFraction))
      : currentPrice * (1 + dropFraction);
  }, [currentPrice, leverage, side]);

  const estFeeAUSD = (positionSizeAUSD * 0.000345).toFixed(3); // 3.45 bps Perpl taker fee

  const handleTrade = async () => {
    if (!activeMarket) return;
    if (marginNum < 10) {
      toast.error("Margin too small", "Minimum margin is 10 AUSD.");
      return;
    }

    const userAddress = user?.address || me?.address;
    if (!userAddress) {
      toast.error("Wallet not ready", "Please connect or login with Privy.");
      return;
    }

    setSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await placePerplOrder({
        trader: userAddress,
        symbol: activeMarket.symbol,
        side,
        marginAUSD: marginNum,
        leverage,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show("Perpl Order Placed", {
        body: `${side} ${activeMarket.symbol} · ${leverage}x ($${positionSizeAUSD.toLocaleString()})`,
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

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Market Selector Chips */}
      <View style={styles.marketRow}>
        {marketsLoading && !markets.length ? (
          <ActivityIndicator color={colors.brand} size="small" />
        ) : (
          markets.slice(0, 5).map((m) => {
            const isSelected = activeMarket?.symbol === m.symbol;
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  setSelectedSymbol(m.symbol);
                  Haptics.selectionAsync();
                }}
                style={[styles.marketChip, isSelected && styles.marketChipActive]}
              >
                <Text style={[styles.marketChipText, isSelected && styles.marketChipTextActive]}>
                  {m.symbol}
                </Text>
                <Text
                  style={[
                    styles.marketChipDelta,
                    m.change24hPct >= 0 ? styles.posText : styles.negText,
                  ]}
                >
                  {m.change24hPct >= 0 ? "+" : ""}
                  {m.change24hPct}%
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Main Ticker Card */}
      {activeMarket && (
        <View style={styles.tickerCard}>
          <View style={styles.tickerHeader}>
            <View>
              <Text style={styles.tickerTitle}>{activeMarket.name}</Text>
              <Text style={styles.tickerSub}>Perpl DEX · Monad Testnet</Text>
            </View>
            <View style={styles.priceWrap}>
              <Text style={styles.tickerPrice}>
                ${activeMarket.markPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: activeMarket.priceDecimals,
                })}
              </Text>
              <Text
                style={[
                  styles.tickerChange,
                  activeMarket.change24hPct >= 0 ? styles.posText : styles.negText,
                ]}
              >
                {activeMarket.change24hPct >= 0 ? "▲" : "▼"} {Math.abs(activeMarket.change24hPct)}% 24h
              </Text>
            </View>
          </View>

          <View style={styles.tickerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>24h Vol</Text>
              <Text style={styles.statValue}>${(activeMarket.volume24hAUSD / 1000).toFixed(0)}k</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Funding</Text>
              <Text style={styles.statValue}>{activeMarket.fundingRateBps} bps</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Open Interest</Text>
              <Text style={styles.statValue}>{activeMarket.openInterest} {activeMarket.symbol}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Direction: Long / Short */}
      <View style={styles.sideContainer}>
        <Pressable
          style={[styles.sideBtn, side === "LONG" && styles.sideBtnLongActive]}
          onPress={() => {
            setSide("LONG");
            Haptics.selectionAsync();
          }}
        >
          <Text style={[styles.sideBtnText, side === "LONG" && styles.sideBtnTextActive]}>
            BUY / LONG ▲
          </Text>
        </Pressable>

        <Pressable
          style={[styles.sideBtn, side === "SHORT" && styles.sideBtnShortActive]}
          onPress={() => {
            setSide("SHORT");
            Haptics.selectionAsync();
          }}
        >
          <Text style={[styles.sideBtnText, side === "SHORT" && styles.sideBtnTextActive]}>
            SELL / SHORT ▼
          </Text>
        </Pressable>
      </View>

      {/* Leverage Selector */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LEVERAGE</Text>
          <Text style={styles.sectionHighlight}>{leverage}x</Text>
        </View>
        <View style={styles.chipRow}>
          {LEVERAGE_OPTIONS.map((lev) => (
            <Pressable
              key={lev}
              onPress={() => {
                setLeverage(lev);
                Haptics.selectionAsync();
              }}
              style={[styles.levChip, leverage === lev && styles.levChipActive]}
            >
              <Text style={[styles.levChipText, leverage === lev && styles.levChipTextActive]}>
                {lev}x
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Margin Amount Input */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>COLLATERAL (AGORA AUSD)</Text>
          <Text style={styles.sectionBalance}>
            Avail: {me ? Number(me.ausd).toFixed(1) : "0.0"} AUSD
          </Text>
        </View>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={marginAUSD}
            onChangeText={setMarginAUSD}
            keyboardType="numeric"
            placeholder="50"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.inputSuffix}>AUSD</Text>
        </View>

        <View style={styles.chipRow}>
          {MARGIN_CHIPS.map((ch) => (
            <Pressable
              key={ch}
              onPress={() => {
                setMarginAUSD(ch);
                Haptics.selectionAsync();
              }}
              style={[styles.amountChip, marginAUSD === ch && styles.amountChipActive]}
            >
              <Text style={[styles.amountChipText, marginAUSD === ch && styles.amountChipTextActive]}>
                ${ch}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Position Size</Text>
          <Text style={styles.summaryVal}>
            ${positionSizeAUSD.toLocaleString()} ({positionSizeUnits} {activeMarket?.symbol})
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Entry Price</Text>
          <Text style={styles.summaryVal}>${currentPrice.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Est. Liquidation Price</Text>
          <Text style={[styles.summaryVal, { color: colors.danger }]}>
            ${estLiqPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Est. Protocol Fee</Text>
          <Text style={styles.summaryVal}>${estFeeAUSD} AUSD</Text>
        </View>
      </View>

      {/* Trade CTA */}
      <Pressable
        style={[
          styles.ctaBtn,
          side === "LONG" ? styles.ctaLong : styles.ctaShort,
          submitting && { opacity: 0.7 },
        ]}
        onPress={handleTrade}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.ctaText}>
            {side === "LONG" ? "OPEN LONG" : "OPEN SHORT"} {activeMarket?.symbol} ({leverage}x)
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.md,
    paddingBottom: 40,
  },
  marketRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  marketChip: {
    backgroundColor: colors.bgElevated,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
  },
  marketChipActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  marketChipText: {
    fontFamily: type.bold,
    fontSize: 13,
    color: colors.ink,
  },
  marketChipTextActive: {
    color: colors.brand,
  },
  marketChipDelta: {
    fontFamily: type.body,
    fontSize: 10,
    marginTop: 2,
  },
  posText: {
    color: colors.up,
  },
  negText: {
    color: colors.down,
  },
  tickerCard: {
    backgroundColor: colors.bgCard,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    gap: 12,
  },
  tickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tickerTitle: {
    fontFamily: type.title.fontFamily,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: 1,
  },
  tickerSub: {
    fontFamily: type.body,
    fontSize: 11,
    color: colors.muted,
  },
  priceWrap: {
    alignItems: "flex-end",
  },
  tickerPrice: {
    fontFamily: type.data,
    fontSize: 20,
    color: colors.ink,
    fontWeight: "700",
  },
  tickerChange: {
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  tickerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontFamily: type.body,
    fontSize: 10,
    color: colors.muted,
    textTransform: "uppercase",
  },
  statValue: {
    fontFamily: type.data,
    fontSize: 12,
    color: colors.ink,
    marginTop: 2,
  },
  sideContainer: {
    flexDirection: "row",
    gap: 10,
  },
  sideBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
  },
  sideBtnLongActive: {
    backgroundColor: colors.up,
    borderColor: colors.up,
  },
  sideBtnShortActive: {
    backgroundColor: colors.down,
    borderColor: colors.down,
  },
  sideBtnText: {
    fontFamily: type.bold,
    fontSize: 14,
    color: colors.muted,
  },
  sideBtnTextActive: {
    color: "#0A0B0D",
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: type.body,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
  },
  sectionHighlight: {
    fontFamily: type.bold,
    fontSize: 14,
    color: colors.brand,
  },
  sectionBalance: {
    fontFamily: type.body,
    fontSize: 11,
    color: colors.muted,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  levChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
  },
  levChipActive: {
    backgroundColor: colors.brandDim,
    borderColor: colors.brand,
  },
  levChipText: {
    fontFamily: type.bold,
    fontSize: 13,
    color: colors.ink,
  },
  levChipTextActive: {
    color: colors.brand,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: type.data,
    fontSize: 18,
    color: colors.ink,
    paddingVertical: 12,
  },
  inputSuffix: {
    fontFamily: type.bold,
    fontSize: 12,
    color: colors.muted,
  },
  amountChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
  },
  amountChipActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  amountChipText: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.ink,
  },
  amountChipTextActive: {
    color: colors.brand,
  },
  summaryCard: {
    backgroundColor: colors.bgElevated,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.muted,
  },
  summaryVal: {
    fontFamily: type.data,
    fontSize: 12,
    color: colors.ink,
  },
  ctaBtn: {
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  ctaLong: {
    backgroundColor: colors.up,
  },
  ctaShort: {
    backgroundColor: colors.down,
  },
  ctaText: {
    fontFamily: type.bold,
    fontSize: 15,
    color: "#0A0B0D",
    letterSpacing: 0.5,
  },
});
