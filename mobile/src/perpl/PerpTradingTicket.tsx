import { useState, useMemo } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput, ActivityIndicator, Dimensions } from "react-native";
import { haptic as hapticFx } from "@/src/utils/clipboard";
const Haptics = {
  selectionAsync: () => hapticFx("selection"),
  impactAsync: (_style?: unknown) => hapticFx("medium"),
  notificationAsync: (t?: number) => hapticFx(t === 2 ? "error" : t === 1 ? "warning" : "success"),
  ImpactFeedbackStyle: { Medium: "medium", Light: "light" },
  NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
};
import { router } from "expo-router";
import { useAuth } from "@/src/auth/AuthContext";
import { useWallet } from "@/src/wallet/WalletContext";
import { useToast } from "@/src/components/Toast";
import { usePerplMarkets, placePerplOrder, PerplMarket } from "./perplClient";
import { Icon } from "@/src/components/Icon";
import { setSelectedMarket } from "@/src/market/selection";
import { colors, radius, space, type, monoStyle } from "@/src/theme";
import { TokenLogo } from "@/src/components/TokenLogo";
import { useLivePrice } from "@/src/hooks/useLivePrice";
import { AnimatedLiveTicker } from "@/src/components/AnimatedLiveTicker";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";

const { width: W } = Dimensions.get("window");

const LEVERAGE_OPTIONS = [2, 5, 10, 20] as const;
const MARGIN_CHIPS = ["25", "50", "100", "500"] as const;

function MiniWaveChart({
  symbol = "BTC",
  markPrice = 0,
  change24hPct = 0,
}: {
  symbol?: string;
  markPrice?: number;
  change24hPct?: number;
}) {
  const isUp = change24hPct >= 0;
  const strokeColor = isUp ? colors.up : colors.down;

  const { linePath, areaPath, lastPoint } = useMemo(() => {
    const chartW = 320;
    const chartH = 60;
    const padX = 6;
    const padY = 8;
    const usableW = chartW - padX * 2 - 12; // leave margin for pulse beacon
    const usableH = chartH - padY * 2;

    const nPoints = 18;
    const deltaFrac = (change24hPct || 0) / 100;
    const startP = markPrice > 0 ? markPrice / (1 + deltaFrac) : 100;
    const endP = markPrice > 0 ? markPrice : 100 * (1 + deltaFrac);

    let seed = 0;
    for (let i = 0; i < symbol.length; i++) seed = (seed * 31 + symbol.charCodeAt(i)) % 1000;

    const rawValues: number[] = [];
    for (let i = 0; i < nPoints; i++) {
      const t = i / (nPoints - 1);
      const base = startP + (endP - startP) * t;
      const wave1 = Math.sin(t * Math.PI * 2.2 + (seed % 7)) * (Math.abs(endP - startP) * 0.35 + base * 0.003);
      const wave2 = Math.cos(t * Math.PI * 4.1 + (seed % 11)) * (base * 0.0015);
      const damping = 1 - Math.pow(t, 2);
      const val = i === 0 ? startP : i === nPoints - 1 ? endP : base + (wave1 + wave2) * damping;
      rawValues.push(val);
    }

    const minV = Math.min(...rawValues);
    const maxV = Math.max(...rawValues);
    const range = maxV - minV || 1;

    const coords = rawValues.map((v, i) => {
      const x = padX + (i / (nPoints - 1)) * usableW;
      const normY = (v - minV) / range;
      const y = padY + (1 - normY) * usableH;
      return { x, y };
    });

    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[Math.max(0, i - 1)];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[Math.min(coords.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const last = coords[coords.length - 1];
    const first = coords[0];
    const area = `${d} L ${last.x.toFixed(1)} ${chartH} L ${first.x.toFixed(1)} ${chartH} Z`;

    return {
      linePath: d,
      areaPath: area,
      lastPoint: last,
    };
  }, [symbol, markPrice, change24hPct]);

  return (
    <View style={styles.chartContainer}>
      <Svg width="100%" height={60} viewBox="0 0 320 60" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`heroWaveGrad_${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <Stop offset="85%" stopColor={strokeColor} stopOpacity="0.02" />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill={`url(#heroWaveGrad_${symbol})`} />
        <Path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={lastPoint.x} cy={lastPoint.y} r={5.5} fill={strokeColor} opacity={0.35} />
        <Circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

export function PerpTradingTicket() {
  const { user } = useAuth();
  const { me, refresh: refreshWallet } = useWallet();
  const toast = useToast();
  const { markets, loading: marketsLoading, refresh: refreshMarkets } = usePerplMarkets(1500);

  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const livePrice = useLivePrice(selectedSymbol, 1200);
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [leverage, setLeverage] = useState<number>(10);
  const [marginAUSD, setMarginAUSD] = useState<string>("50");
  const [submitting, setSubmitting] = useState(false);

  // TP / SL Guard protection state
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpPresetPct, setTpPresetPct] = useState<number>(50); // +50% ROI
  const [slPresetPct, setSlPresetPct] = useState<number>(25); // -25% max loss
  const [customTpPrice, setCustomTpPrice] = useState<string>("");
  const [customSlPrice, setCustomSlPrice] = useState<string>("");

  const activeMarket = useMemo(() => {
    return markets.find((m) => m.symbol.toUpperCase() === selectedSymbol.toUpperCase()) || markets[0];
  }, [markets, selectedSymbol]);

  const marginNum = parseFloat(marginAUSD) || 0;
  const positionSizeAUSD = marginNum * leverage;
  const currentPrice = activeMarket ? activeMarket.markPrice : 0;

  // Est Liquidation price
  const estLiqPrice = useMemo(() => {
    if (!currentPrice || leverage <= 0) return 0;
    const dropFraction = 1 / leverage - 0.05;
    return side === "LONG"
      ? Math.max(0, currentPrice * (1 - dropFraction))
      : currentPrice * (1 + dropFraction);
  }, [currentPrice, leverage, side]);

  const targetTpPrice = useMemo(() => {
    if (!currentPrice || leverage <= 0) return 0;
    if (customTpPrice) {
      const p = parseFloat(customTpPrice);
      if (p > 0) return p;
    }
    const deltaFraction = (tpPresetPct / 100) / leverage;
    const target = side === "LONG"
      ? currentPrice * (1 + deltaFraction)
      : Math.max(0, currentPrice * (1 - deltaFraction));
    return Number(target.toFixed(activeMarket?.priceDecimals || 1));
  }, [currentPrice, leverage, side, tpPresetPct, customTpPrice, activeMarket]);

  const targetSlPrice = useMemo(() => {
    if (!currentPrice || leverage <= 0) return 0;
    if (customSlPrice) {
      const p = parseFloat(customSlPrice);
      if (p > 0) return p;
    }
    const deltaFraction = (slPresetPct / 100) / leverage;
    const target = side === "LONG"
      ? Math.max(0, currentPrice * (1 - deltaFraction))
      : currentPrice * (1 + deltaFraction);
    return Number(target.toFixed(activeMarket?.priceDecimals || 1));
  }, [currentPrice, leverage, side, slPresetPct, customSlPrice, activeMarket]);

  const handleTrade = async () => {
    if (!activeMarket) {
      toast.error("No market", "Perpl markets must load from the API first.");
      return;
    }
    if (!user?.address) {
      toast.error("Wallet required", "Sign in with Face ID / Mera passkey to place a Perpl order.");
      return;
    }
    if (marginNum < 5) {
      toast.error("Margin too small", "Minimum margin is 5 AUSD.");
      return;
    }

    const userAddress = user.address;
    setSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const finalTp = tpEnabled && targetTpPrice > 0 ? targetTpPrice : undefined;
    const finalSl = slEnabled && targetSlPrice > 0 ? targetSlPrice : undefined;

    try {
      const res = await placePerplOrder({
        trader: userAddress,
        symbol: activeMarket.symbol,
        side,
        marginAUSD: marginNum,
        leverage,
        tpPrice: finalTp,
        slPrice: finalSl,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const guardStr = [
        finalTp ? `TP $${finalTp}` : null,
        finalSl ? `SL $${finalSl}` : null,
      ].filter(Boolean).join(" · ");
      toast.show("Order Executed", {
        body: `${side} ${activeMarket.symbol} · ${leverage}x ($${positionSizeAUSD.toLocaleString()} AUSD)${guardStr ? ` · ${guardStr}` : ""}`,
        tone: "success",
        actionLabel: "View in Portfolio",
        onAction: () => {
          router.push("/(app)/positions");
        },
      });

      refreshWallet();
      refreshMarkets();
    } catch (e: any) {
      toast.error("Order Failed", e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const displayMarkets: PerplMarket[] = markets;

  const currentMark = activeMarket || displayMarkets[0];
  const availBalance = me?.ausd != null ? Number(me.ausd).toFixed(2) : "—";

  return (
    <ScrollView
      style={{ flex: 1, width: "100%", alignSelf: "stretch" }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {!currentMark ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>{marketsLoading ? "Loading Perpl markets…" : "No Perpl markets"}</Text>
          <Text style={styles.emptyBody}>
            {marketsLoading
              ? "Fetching live testnet markets from the API."
              : "Start the API (npm run api) or check Perpl testnet connectivity."}
          </Text>
        </View>
      ) : (
        <>
      {/* Top Ticker Selector Strip — tap switches market */}
      <View style={styles.tickerStrip}>
        {displayMarkets.map((m) => {
          const isSel = currentMark.symbol === m.symbol;
          return (
            <Pressable
              key={m.symbol}
              onPress={() => {
                setSelectedSymbol(m.symbol);
                setSelectedMarket({
                  symbol: m.symbol,
                  pair: `${m.symbol}-USD`,
                  label: `${m.symbol} / USD`,
                  chain: "monad",
                  chainId: 10143,
                });
                Haptics.selectionAsync();
              }}
              style={[styles.stripPill, isSel && styles.stripPillActive]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <TokenLogo symbol={m.symbol} size={14} />
                <Text style={[styles.stripSymbol, isSel && styles.stripSymbolActive]}>
                  {m.symbol}
                </Text>
              </View>
              <Text style={styles.stripPrice}>
                ${m.markPrice >= 1000 ? m.markPrice.toLocaleString(undefined, { maximumFractionDigits: 0 }) : m.markPrice.toFixed(2)}
              </Text>
              <Text style={[styles.stripDelta, m.change24hPct >= 0 ? { color: colors.up } : { color: colors.down }]} numberOfLines={1}>
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
          <Pressable
            onPress={() => {
              setSelectedMarket({
                symbol: currentMark.symbol,
                pair: `${currentMark.symbol}-USD`,
                label: `${currentMark.symbol} / USD`,
                chain: "monad",
                chainId: 10143,
              });
              router.push({
                pathname: "/(app)/market-detail",
                params: { symbol: currentMark.symbol, kind: "perp" },
              });
            }}
            style={styles.subSecondBadge}
            hitSlop={8}
          >
            <Text style={styles.subSecondText}>OPEN CHART →</Text>
          </Pressable>
        </View>

        <View style={styles.priceBlock}>
          <AnimatedLiveTicker
            price={livePrice.price}
            prevPrice={livePrice.prevPrice}
            direction={livePrice.direction}
            delta={livePrice.delta}
            tickCount={livePrice.tickCount}
            size="hero"
            showBadge={true}
          />
          <View style={styles.priceMetaRow}>
            <Text
              style={[
                styles.bigDelta,
                currentMark.change24hPct >= 0 ? { color: colors.up } : { color: colors.down },
              ]}
            >
              {currentMark.change24hPct >= 0 ? "+" : ""}
              {currentMark.change24hPct.toFixed(2)}%
            </Text>
            <View style={styles.metaDot} />
            <Text style={styles.pythFeedText}>Perpl DEX</Text>
            <View style={styles.metaDot} />
            <Text style={styles.pythFeedText}>Realtime</Text>
          </View>
        </View>

        {/* Wave area graphic */}
        <MiniWaveChart
          symbol={activeMarket?.symbol || selectedSymbol}
          markPrice={livePrice.price}
          change24hPct={currentMark.change24hPct}
        />

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

      {/* TAKE PROFIT & STOP LOSS (TP/SL) GUARD SECTION */}
      <View style={styles.guardSection}>
        <View style={styles.guardSectionHeader}>
          <View style={styles.guardShieldBadge}>
            <Text style={styles.guardShieldBadgeText}>AUTO</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guardSectionTitle}>TAKE PROFIT & STOP LOSS</Text>
            <Text style={styles.guardSectionSub}>Perpl signed WebSocket keeper automation</Text>
          </View>
        </View>

        {/* Take Profit (TP) */}
        <View style={[styles.guardBox, tpEnabled && styles.guardBoxActive]}>
          <View style={styles.guardRowTop}>
            <Pressable
              onPress={() => {
                setTpEnabled(!tpEnabled);
                Haptics.selectionAsync();
              }}
              style={styles.toggleRow}
            >
              <View style={[styles.checkbox, tpEnabled && styles.checkboxActive]}>
                {tpEnabled && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.guardLabel}>TAKE PROFIT (TP)</Text>
            </Pressable>
            {tpEnabled && (
              <Text style={styles.guardCalculatedPrice}>
                Target: ${targetTpPrice > 0 ? targetTpPrice.toLocaleString(undefined, { maximumFractionDigits: activeMarket?.priceDecimals || 1 }) : "—"}
              </Text>
            )}
          </View>

          {tpEnabled && (
            <View style={styles.guardOptions}>
              <View style={styles.presetChips}>
                {[25, 50, 100].map((pct) => (
                  <Pressable
                    key={pct}
                    onPress={() => {
                      setTpPresetPct(pct);
                      setCustomTpPrice("");
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.guardChip,
                      tpPresetPct === pct && !customTpPrice && styles.guardChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.guardChipText,
                        tpPresetPct === pct && !customTpPrice && styles.guardChipTextActive,
                      ]}
                    >
                      +{pct}%
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.guardEstRow}>
                <Text style={styles.guardEstLabel}>Est. Profit:</Text>
                <Text style={styles.guardEstProfit}>
                  +${((marginNum * (tpPresetPct || 50)) / 100).toFixed(2)} AUSD
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Stop Loss (SL) */}
        <View style={[styles.guardBox, slEnabled && styles.guardBoxActiveSL]}>
          <View style={styles.guardRowTop}>
            <Pressable
              onPress={() => {
                setSlEnabled(!slEnabled);
                Haptics.selectionAsync();
              }}
              style={styles.toggleRow}
            >
              <View style={[styles.checkbox, slEnabled && styles.checkboxActiveSL]}>
                {slEnabled && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.guardLabel}>STOP LOSS (SL)</Text>
            </Pressable>
            {slEnabled && (
              <Text style={[styles.guardCalculatedPrice, { color: colors.down }]}>
                Stop: ${targetSlPrice > 0 ? targetSlPrice.toLocaleString(undefined, { maximumFractionDigits: activeMarket?.priceDecimals || 1 }) : "—"}
              </Text>
            )}
          </View>

          {slEnabled && (
            <View style={styles.guardOptions}>
              <View style={styles.presetChips}>
                {[15, 25, 50].map((pct) => (
                  <Pressable
                    key={pct}
                    onPress={() => {
                      setSlPresetPct(pct);
                      setCustomSlPrice("");
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.guardChip,
                      slPresetPct === pct && !customSlPrice && styles.guardChipActiveSL,
                    ]}
                  >
                    <Text
                      style={[
                        styles.guardChipText,
                        slPresetPct === pct && !customSlPrice && styles.guardChipTextActiveSL,
                      ]}
                    >
                      -{pct}%
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.guardEstRow}>
                <Text style={styles.guardEstLabel}>Max Loss:</Text>
                <Text style={styles.guardEstLoss}>
                  -${((marginNum * (slPresetPct || 25)) / 100).toFixed(2)} AUSD
                </Text>
              </View>
            </View>
          )}
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
        {tpEnabled && (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>TP TARGET</Text>
            <Text style={[styles.specVal, { color: colors.up }]}>
              ${targetTpPrice.toLocaleString()} (+{tpPresetPct}%)
            </Text>
          </View>
        )}
        {slEnabled && (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>SL STOP</Text>
            <Text style={[styles.specVal, { color: colors.down }]}>
              ${targetSlPrice.toLocaleString()} (-{slPresetPct}%)
            </Text>
          </View>
        )}
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
            <Icon name="flash" size={16} color="#000000" />
            <Text style={styles.mainActionText}>
              OPEN {side} {currentMark.symbol} ({leverage}X)
            </Text>
          </>
        )}
      </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    width: "100%",
    padding: 24,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgElevated,
    gap: 8,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 16,
  },
  emptyBody: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 18,
  },
  container: {
    width: "100%",
    alignSelf: "stretch",
    alignItems: "stretch",
    // Single gutter — parent trade shell has paddingHorizontal 0
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 36,
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
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 120,
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
  priceBlock: {
    gap: 4,
    marginTop: 12,
  },
  priceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.line,
  },
  bigPrice: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
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
  },
  chartContainer: {
    height: 60,
    width: "100%",
    marginVertical: 10,
    overflow: "hidden",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    paddingTop: 12,
    marginTop: 2,
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
  guardSection: {
    backgroundColor: "#10131A",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E2330",
    gap: 10,
  },
  guardSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  guardShieldBadge: {
    backgroundColor: "rgba(214, 255, 63, 0.12)",
    borderColor: "rgba(214, 255, 63, 0.4)",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  guardShieldBadgeText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  guardSectionTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  guardSectionSub: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
  },
  guardBox: {
    backgroundColor: "#161A23",
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: "#222735",
    gap: 8,
  },
  guardBoxActive: {
    borderColor: "rgba(46,229,157,0.4)",
    backgroundColor: "#111A18",
  },
  guardBoxActiveSL: {
    borderColor: "rgba(255,77,106,0.4)",
    backgroundColor: "#1C1418",
  },
  guardRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxActive: {
    borderColor: colors.up,
    backgroundColor: colors.up,
  },
  checkboxActiveSL: {
    borderColor: colors.down,
    backgroundColor: colors.down,
  },
  checkmark: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "bold",
    lineHeight: 13,
  },
  guardLabel: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  guardCalculatedPrice: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "bold",
  },
  guardOptions: {
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  presetChips: {
    flexDirection: "row",
    gap: 6,
  },
  guardChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "#1F2533",
    borderWidth: 1,
    borderColor: "#2B3245",
  },
  guardChipActive: {
    backgroundColor: "rgba(46,229,157,0.15)",
    borderColor: colors.up,
  },
  guardChipActiveSL: {
    backgroundColor: "rgba(255,77,106,0.15)",
    borderColor: colors.down,
  },
  guardChipText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "600",
  },
  guardChipTextActive: {
    color: colors.up,
    fontWeight: "bold",
  },
  guardChipTextActiveSL: {
    color: colors.down,
    fontWeight: "bold",
  },
  guardEstRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guardEstLabel: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
  },
  guardEstProfit: {
    color: colors.up,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "bold",
  },
  guardEstLoss: {
    color: colors.down,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "bold",
  },
});
