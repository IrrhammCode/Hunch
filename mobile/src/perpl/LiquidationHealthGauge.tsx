import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radius, space, type, monoStyle } from "@/src/theme";
import type { PerplRiskReport } from "@/src/api/client";
import { haptic } from "@/src/utils/clipboard";

interface LiquidationHealthGaugeProps {
  risk: PerplRiskReport | null;
  onDepositPress?: () => void;
}

export function LiquidationHealthGauge({ risk, onDepositPress }: LiquidationHealthGaugeProps) {
  const collateral = risk?.collateralAUSD ?? 0;
  const marginUsed = risk?.marginUsedAUSD ?? 0;
  const freeMargin = risk?.freeMarginAUSD ?? 0;
  const effLev = risk?.effectiveLeverage ?? 0;
  const level = risk?.riskLevel ?? "FLAT";

  // Margin utilization % (0% to 100%)
  const utilizationPct = collateral > 0 ? Math.min(100, Math.round((marginUsed / collateral) * 100)) : 0;

  // Closest liquidation distance across all open positions
  const positions = risk?.positions ?? [];
  const minLiqDist = positions.reduce<number | null>((min, p) => {
    if (p.liqDistancePct == null) return min;
    return min === null ? p.liqDistancePct : Math.min(min, p.liqDistancePct);
  }, null);

  // Interactive scenario shock state
  const [shockPct, setShockPct] = React.useState<number | null>(null);

  const simulatedImpact = React.useMemo(() => {
    if (shockPct == null || positions.length === 0) return null;
    let projPnl = 0;
    for (const p of positions) {
      const mark = p.markPrice ?? p.entryPrice;
      const shockedPrice = mark * (1 + shockPct / 100);
      const delta = shockedPrice - p.entryPrice;
      const pnl = p.side === "LONG" ? delta * (p.size || 0) : -delta * (p.size || 0);
      projPnl += pnl;
    }
    const projCollat = Math.max(0, collateral + projPnl);
    const projUtil = projCollat > 0 ? Math.min(100, Math.round((marginUsed / projCollat) * 100)) : 100;
    const isLiquidated = projCollat < marginUsed * 0.2;
    return {
      projPnl,
      projCollat,
      projUtil,
      isLiquidated,
    };
  }, [shockPct, positions, collateral, marginUsed]);

  const getStatusColor = () => {
    if (level === "HIGH" || utilizationPct > 80) return colors.down;
    if (level === "MEDIUM" || utilizationPct > 50) return "#FFD13B";
    if (level === "LOW") return colors.up;
    return colors.muted;
  };

  const getStatusText = () => {
    if (positions.length === 0) return "FLAT · NO POSITIONS";
    if (level === "HIGH" || utilizationPct > 80) return "DANGER · HIGH RISK";
    if (level === "MEDIUM" || utilizationPct > 50) return "MODERATE · MONITOR";
    return "HEALTHY · LOW RISK";
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>LIQUIDATION HEALTH GAUGE</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: getStatusColor() }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
        </View>
      </View>

      {/* Visual Multi-Segment Gauge */}
      <View style={styles.gaugeBarContainer}>
        <View style={styles.gaugeTrack}>
          {/* Fill based on utilization */}
          <View
            style={[
              styles.gaugeFill,
              {
                width: `${Math.max(4, utilizationPct)}%`,
                backgroundColor: getStatusColor(),
              },
            ]}
          />
        </View>
        {/* Gauge Ticks */}
        <View style={styles.tickRow}>
          <Text style={styles.tickText}>0% (SAFE)</Text>
          <Text style={styles.tickText}>50%</Text>
          <Text style={styles.tickText}>80% (DANGER)</Text>
          <Text style={styles.tickText}>100%</Text>
        </View>
      </View>

      {/* Primary Metrics Grid */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>UTILIZATION</Text>
          <Text style={[styles.metricVal, { color: getStatusColor() }]}>{utilizationPct}%</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>LIQ. BUFFER</Text>
          <Text style={[styles.metricVal, minLiqDist != null && minLiqDist < 10 ? { color: colors.down } : styles.safeVal]}>
            {minLiqDist != null ? `+${minLiqDist.toFixed(1)}%` : "SAFE"}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>EFF. LEVERAGE</Text>
          <Text style={styles.metricVal}>{effLev > 0 ? `${effLev}x` : "1.0x"}</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>FREE MARGIN</Text>
          <Text style={[styles.metricVal, { color: colors.brand }]}>
            ${freeMargin > 0 ? freeMargin.toFixed(0) : "0"}
          </Text>
        </View>
      </View>

      {/* Interactive Scenario Shock Simulator */}
      {positions.length > 0 && (
        <View style={styles.simulatorWrap}>
          <View style={styles.simulatorHeader}>
            <Text style={styles.simulatorTitle}>SCENARIO SHOCK SIMULATOR</Text>
            {shockPct != null && (
              <Pressable
                onPress={() => {
                  haptic("selection");
                  setShockPct(null);
                }}
              >
                <Text style={styles.resetText}>RESET</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.chipsRow}>
            {[-10, -5, 5, 10].map((pct) => (
              <Pressable
                key={pct}
                onPress={() => {
                  haptic("selection");
                  setShockPct(shockPct === pct ? null : pct);
                }}
                style={[
                  styles.shockChip,
                  shockPct === pct && styles.shockChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.shockChipText,
                    pct < 0 ? { color: colors.down } : { color: colors.up },
                    shockPct === pct && { fontWeight: "bold" },
                  ]}
                >
                  {pct > 0 ? `+${pct}%` : `${pct}%`}
                </Text>
              </Pressable>
            ))}
          </View>

          {simulatedImpact && (
            <View style={styles.impactCard}>
              <View style={styles.impactRow}>
                <Text style={styles.impactLabel}>PROJECTED PnL</Text>
                <Text
                  style={[
                    styles.impactVal,
                    { color: simulatedImpact.projPnl >= 0 ? colors.up : colors.down },
                  ]}
                >
                  {simulatedImpact.projPnl >= 0 ? "+" : ""}${simulatedImpact.projPnl.toFixed(2)} AUSD
                </Text>
              </View>
              <View style={styles.impactRow}>
                <Text style={styles.impactLabel}>PROJ. UTILIZATION</Text>
                <Text
                  style={[
                    styles.impactVal,
                    { color: simulatedImpact.projUtil > 80 ? colors.down : colors.brand },
                  ]}
                >
                  {simulatedImpact.projUtil}% ({simulatedImpact.isLiquidated ? "AT RISK" : "SAFE"})
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Warning Alert Banner (if any warning from Perpl risk engine) */}
      {risk?.warnings && risk.warnings.length > 0 && (
        <View style={styles.warningBox}>
          <View style={styles.warningBadge}>
            <Text style={styles.warningBadgeText}>WARNING</Text>
          </View>
          <Text style={styles.warningText} numberOfLines={2}>
            {risk.warnings[0]}
          </Text>
          {onDepositPress && (
            <Pressable
              onPress={() => {
                haptic("selection");
                onDepositPress();
              }}
              style={styles.addMarginBtn}
            >
              <Text style={styles.addMarginBtnText}>+ MARGIN</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#10131A",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E2433",
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  titleIcon: {
    fontSize: 13,
  },
  title: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#161A23",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "bold",
  },
  gaugeBarContainer: {
    gap: 4,
  },
  gaugeTrack: {
    height: 7,
    backgroundColor: "#1C212E",
    borderRadius: 4,
    overflow: "hidden",
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 4,
  },
  tickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tickText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 8,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0B0D12",
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#1A1F2B",
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  metricVal: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 12,
    fontWeight: "bold",
  },
  safeVal: {
    color: colors.up,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#240B10",
    borderWidth: 1.5,
    borderColor: "#FF4D6A",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    gap: 8,
  },
  warningBadge: {
    backgroundColor: "#3E121C",
    borderColor: "#FF4D6A",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  warningBadgeText: {
    color: "#FF4D6A",
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  warningText: {
    flex: 1,
    color: "#FFCCD4",
    fontFamily: type.bold,
    fontSize: 11,
  },
  addMarginBtn: {
    backgroundColor: "#D6FF3F",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  addMarginBtnText: {
    color: "#0A0B0D",
    fontFamily: type.bold,
    fontSize: 9,
  },
  simulatorWrap: {
    backgroundColor: "#141822",
    borderRadius: radius.md,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#1E2433",
  },
  simulatorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  simulatorTitle: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  resetText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 9,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 6,
  },
  shockChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: "#1B2130",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  shockChipActive: {
    borderColor: colors.brand,
    backgroundColor: "rgba(214,255,63,0.15)",
  },
  shockChipText: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "600",
  },
  impactCard: {
    backgroundColor: "#0D1017",
    borderRadius: radius.sm,
    padding: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  impactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  impactLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 8,
  },
  impactVal: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "bold",
  },
});
