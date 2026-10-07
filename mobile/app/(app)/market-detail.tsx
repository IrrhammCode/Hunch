import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { haptic as hapticFx } from "@/src/utils/clipboard";
const Haptics = {
  selectionAsync: () => hapticFx("selection"),
  impactAsync: (_style?: unknown) => hapticFx("medium"),
  notificationAsync: (t?: number) => hapticFx(t === 2 ? "error" : t === 1 ? "warning" : "success"),
  ImpactFeedbackStyle: { Medium: "medium", Light: "light" },
  NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
};
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { TokenLogo } from "@/src/components/TokenLogo";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import { PriceChart, type ChartPoint } from "@/src/components/PriceChart";
import { AmountChip, PrimaryButton } from "@/src/components/ui";
import { getSelectedMarket, setSelectedMarket } from "@/src/market/selection";
import { useWallet } from "@/src/wallet/WalletContext";
import { placeWalletTrade } from "@/src/wallet/privyTrade";
import { useLivePrice } from "@/src/hooks/useLivePrice";
import { AnimatedLiveTicker } from "@/src/components/AnimatedLiveTicker";
import { colors, monoStyle, radius, space, type } from "@/src/theme";

const { width: W } = Dimensions.get("window");
const CHART_W = W - 28;
const CHART_H = 248;
const LEVERAGE_OPTIONS = [2, 3, 5, 10, 15, 20, 25, 30, 40, 50] as const;
const PERP_MARGIN_CHIPS = ["10", "25", "50", "100", "250", "500"] as const;
const BLITZ_MARGIN_CHIPS = ["5", "10", "25", "50", "100"] as const;
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
  const livePrice = useLivePrice(symbol, 1200);
  const [price, setPrice] = useState<number | null>(null);
  const [bars, setBars] = useState<ChartPoint[]>([]);
  const [blitz, setBlitz] = useState<MarketBoardRow | null>(null);
  const [perp, setPerp] = useState<PerplMarket | null>(null);
  const [amount, setAmount] = useState("50");
  const [leverage, setLeverage] = useState<number>(10);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpPresetPct, setTpPresetPct] = useState<number>(50);
  const [slPresetPct, setSlPresetPct] = useState<number>(25);
  const [busy, setBusy] = useState<"UP" | "DOWN" | "LONG" | "SHORT" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  const tfCfg = TFS.find((t) => t.key === tf) || TFS[0]!;

  const loadMeta = useCallback(async () => {
    try {
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
      // Keep existing bars if network blips
    } finally {
      setChartLoading(false);
    }
  }, [symbol, tfCfg.resolution, tfCfg.bars]);

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
      toast.error("Sign in required", "Use Face ID / Mera passkey first.");
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
      const result = await placeWalletTrade({
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

  const marginNum = parseFloat(amount) || 0;
  const positionSizeAUSD = marginNum * leverage;
  const currentPrice = perp?.markPrice || price || 0;
  const estLiqLong = currentPrice > 0 && leverage > 0 ? Math.max(0, currentPrice * (1 - (1 / leverage - 0.05))) : 0;
  const estLiqShort = currentPrice > 0 && leverage > 0 ? currentPrice * (1 + (1 / leverage - 0.05)) : 0;
  const targetTpPrice = (s: "LONG" | "SHORT") => {
    if (!currentPrice || leverage <= 0) return 0;
    const deltaFraction = (tpPresetPct / 100) / leverage;
    return s === "LONG" ? currentPrice * (1 + deltaFraction) : Math.max(0, currentPrice * (1 - deltaFraction));
  };
  const targetSlPrice = (s: "LONG" | "SHORT") => {
    if (!currentPrice || leverage <= 0) return 0;
    const deltaFraction = (slPresetPct / 100) / leverage;
    return s === "LONG" ? Math.max(0, currentPrice * (1 - deltaFraction)) : currentPrice * (1 + deltaFraction);
  };

  const onPerp = async (side: "LONG" | "SHORT") => {
    if (!perp) {
      toast.error("No perp market", "Start API — Perpl markets load from testnet.");
      return;
    }
    if (!user?.address) {
      toast.error("Sign in required", "Use Face ID / Mera passkey first.");
      return;
    }
    if (marginNum < 5) {
      toast.error("Margin too small", "Minimum margin is 5 AUSD.");
      return;
    }
    setBusy(side);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { placePerplOrder } = await import("@/src/api/client");
      const finalTp = tpEnabled && currentPrice > 0 ? Number(targetTpPrice(side).toFixed(perp.priceDecimals || 2)) : undefined;
      const finalSl = slEnabled && currentPrice > 0 ? Number(targetSlPrice(side).toFixed(perp.priceDecimals || 2)) : undefined;
      const res = await placePerplOrder({
        trader: user.address,
        symbol: perp.symbol,
        side,
        marginAUSD: marginNum,
        leverage,
        tpPrice: finalTp,
        slPrice: finalSl,
      });
      if (!res.success) throw new Error("Perpl order rejected");
      const guardStr = [finalTp ? `TP $${finalTp}` : null, finalSl ? `SL $${finalSl}` : null].filter(Boolean).join(" · ");
      toast.show("Perpl order executed", {
        body: `${side} ${perp.symbol} · ${leverage}x ($${positionSizeAUSD.toLocaleString()} AUSD)${guardStr ? ` · ${guardStr}` : ""}`,
        tone: "success",
        actionLabel: "View Portfolio",
        onAction: () => router.push("/(app)/positions"),
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
        {/* Instrument strip */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={16} style={styles.back}>
            <Icon name="arrow-back" size={22} color={colors.ink} />
            <Text style={styles.backText}>Markets</Text>
          </Pressable>
          <TokenLogo symbol={symbol} size={40} />
          <View style={{ flex: 1 }}>
            <View style={styles.symRow}>
              <Text style={styles.symbol}>{symbol}</Text>
              <Text style={styles.pair}>/USD</Text>
              <View style={[styles.modePill, mode === "perp" ? styles.modePerp : styles.modeBlitz]}>
                <Text style={[styles.modePillText, { color: colors.brand }]}>
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
            <Text style={styles.quoteLabel}>LIVE REALTIME</Text>
            <AnimatedLiveTicker
              price={livePrice.price}
              prevPrice={livePrice.prevPrice}
              direction={livePrice.direction}
              delta={livePrice.delta}
              tickCount={livePrice.tickCount}
              size="lg"
              showBadge={true}
            />
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
            <View style={styles.ticketHeaderRow}>
              <Text style={styles.ticketTitle}>
                {mode === "perp" ? "PERPL TICKET" : "60S TICKET"} · AUSD
              </Text>
              <Text style={styles.ticketBalance}>
                AVAIL: {me?.ausd != null ? Number(me.ausd).toFixed(2) : "—"} AUSD
              </Text>
            </View>
            <Text style={styles.ticketSub}>
              {mode === "perp"
                ? `${symbol}-PERP · Up to ${perp?.maxLeverage || 50}x · Monad Testnet`
                : blitzOpen
                  ? `Round #${blitz?.roundId} · Pyth settle on Monad`
                  : "Pyth oracle synced · Next 60s round queued"}
            </Text>

            {/* Collateral Amount Input Section */}
            <View style={styles.inputCard}>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={styles.textInput}
                placeholder="50.00"
                placeholderTextColor={colors.muted}
              />
              <View style={styles.inputRightWrap}>
                <Pressable
                  onPress={() => {
                    const userBal = me?.ausd ? Math.floor(Number(me.ausd)) : 100;
                    setAmount(String(Math.max(5, userBal)));
                    Haptics.selectionAsync();
                  }}
                  style={styles.maxChip}
                >
                  <Text style={styles.maxChipText}>MAX</Text>
                </Pressable>
                <Text style={styles.ausdSuffix}>AUSD</Text>
              </View>
            </View>

            {/* Amount Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.amountChipsRow}>
              {(mode === "perp" ? PERP_MARGIN_CHIPS : BLITZ_MARGIN_CHIPS).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => { setAmount(s); Haptics.selectionAsync(); }}
                  style={[styles.amountChip, amount === s && styles.amountChipActive]}
                >
                  <Text style={[styles.amountChipText, amount === s && styles.amountChipTextActive]}>
                    ${s}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {mode === "perp" && (
              <>
                {/* Leverage Multiplier Section */}
                <View style={styles.levSection}>
                  <View style={styles.levHeader}>
                    <Text style={styles.levTitle}>LEVERAGE MULTIPLIER</Text>
                    <Text style={styles.levHighlight}>{leverage}x</Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levScrollRow}>
                    {LEVERAGE_OPTIONS.map((lev) => {
                      const maxLev = perp?.maxLeverage || 50;
                      const isOverMax = lev > maxLev;
                      const isSel = leverage === lev;
                      return (
                        <Pressable
                          key={lev}
                          disabled={isOverMax}
                          onPress={() => { setLeverage(lev); Haptics.selectionAsync(); }}
                          style={[
                            styles.levChip,
                            isSel && styles.levChipActive,
                            isOverMax && styles.levChipDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.levChipText,
                              isSel && styles.levChipTextActive,
                              isOverMax && styles.levChipTextDisabled,
                            ]}
                          >
                            {lev}x
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Custom Leverage Stepper */}
                  <View style={styles.customLevRow}>
                    <Text style={styles.customLevLabel}>CUSTOM MULTIPLIER</Text>
                    <View style={styles.customLevControls}>
                      <Pressable
                        onPress={() => {
                          const next = Math.max(2, leverage - 1);
                          setLeverage(next);
                          Haptics.selectionAsync();
                        }}
                        style={styles.stepBtn}
                        hitSlop={8}
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </Pressable>
                      <View style={styles.customLevInputWrap}>
                        <TextInput
                          value={String(leverage)}
                          onChangeText={(txt) => {
                            const num = parseInt(txt.replace(/[^0-9]/g, ""), 10);
                            if (!isNaN(num)) {
                              const max = perp?.maxLeverage || 50;
                              setLeverage(Math.min(max, Math.max(1, num)));
                            }
                          }}
                          keyboardType="number-pad"
                          style={styles.customLevInput}
                          maxLength={2}
                        />
                        <Text style={styles.customLevSuffix}>X</Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          const max = perp?.maxLeverage || 50;
                          const next = Math.min(max, leverage + 1);
                          setLeverage(next);
                          Haptics.selectionAsync();
                        }}
                        style={styles.stepBtn}
                        hitSlop={8}
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Position Summary info */}
                <View style={styles.posSizeRow}>
                  <Text style={styles.posSizeLabel}>POSITION SIZE:</Text>
                  <Text style={styles.posSizeVal}>
                    ${positionSizeAUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUSD
                  </Text>
                  {currentPrice > 0 ? (
                    <Text style={styles.liqEstText}>
                      · Liq Long ~${estLiqLong.toFixed(perp?.priceDecimals || 1)}
                    </Text>
                  ) : null}
                </View>

                {/* TP & SL Guards */}
                <View style={styles.guardRow}>
                  <Pressable
                    onPress={() => { setTpEnabled(!tpEnabled); Haptics.selectionAsync(); }}
                    style={[styles.guardPill, tpEnabled && styles.guardPillActive]}
                  >
                    <Text style={[styles.guardPillText, tpEnabled && styles.guardPillTextActive]}>
                      TP +{tpPresetPct}%
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => { setSlEnabled(!slEnabled); Haptics.selectionAsync(); }}
                    style={[styles.guardPill, slEnabled && styles.guardPillActiveSL]}
                  >
                    <Text style={[styles.guardPillText, slEnabled && styles.guardPillTextActiveSL]}>
                      SL -{slPresetPct}%
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {mode === "blitz" ? (
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={busy === "DOWN" ? "…" : `DOWN ${amount} AUSD`}
                    tone="down"
                    disabled={!blitzOpen || busy !== null}
                    onPress={() => onBlitz("DOWN")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={busy === "UP" ? "…" : `UP ${amount} AUSD`}
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
                    label={busy === "SHORT" ? "…" : `SHORT ${symbol} · ${leverage}x`}
                    tone="down"
                    disabled={busy !== null}
                    onPress={() => onPerp("SHORT")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={busy === "LONG" ? "…" : `LONG ${symbol} · ${leverage}x`}
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
  modePerp: { borderColor: "rgba(214,255,63,0.35)", backgroundColor: colors.brandDim },
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
  ticketHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketTitle: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 1.1,
  },
  ticketBalance: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 11,
  },
  ticketSub: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
    lineHeight: 16,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D0F14",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    minWidth: 54,
    backgroundColor: "#171B24",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
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
  levSection: {
    backgroundColor: "#10131A",
    borderRadius: radius.md,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  levHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levTitle: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  levHighlight: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 12,
    fontWeight: "bold",
  },
  levScrollRow: {
    flexDirection: "row",
    gap: 6,
  },
  levChip: {
    minWidth: 44,
    paddingHorizontal: 10,
    backgroundColor: "#191D26",
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  levChipActive: {
    backgroundColor: colors.brand,
  },
  levChipDisabled: {
    opacity: 0.35,
    backgroundColor: "#12141A",
  },
  levChipText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "bold",
  },
  levChipTextActive: {
    color: "#000000",
  },
  levChipTextDisabled: {
    color: "#4E5467",
  },
  customLevRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: 8,
    marginTop: 2,
  },
  customLevLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  customLevControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: "#1A1F2B",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 14,
    lineHeight: 16,
  },
  customLevInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D0F14",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 8,
    height: 26,
    gap: 2,
  },
  customLevInput: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 12,
    fontWeight: "bold",
    minWidth: 20,
    textAlign: "center",
    padding: 0,
  },
  customLevSuffix: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
  },
  posSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  posSizeLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  posSizeVal: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "bold",
  },
  liqEstText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
  },
  guardRow: {
    flexDirection: "row",
    gap: 8,
  },
  guardPill: {
    flex: 1,
    backgroundColor: "#161922",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 6,
    alignItems: "center",
  },
  guardPillActive: {
    backgroundColor: "rgba(38,166,154,0.18)",
    borderColor: colors.up,
  },
  guardPillActiveSL: {
    backgroundColor: "rgba(239,83,80,0.18)",
    borderColor: colors.down,
  },
  guardPillText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  guardPillTextActive: {
    color: colors.up,
  },
  guardPillTextActiveSL: {
    color: colors.down,
  },
  actions: { flexDirection: "row", gap: 10 },
  walletLine: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 11,
    textAlign: "center",
  },
});
