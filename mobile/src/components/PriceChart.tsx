import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, type } from "@/src/theme";

export type ChartPoint = {
  t: number;
  o?: number;
  h?: number;
  l?: number;
  c: number;
  v?: number;
};

function fmtPrice(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 10000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtTime(t: number) {
  const d = new Date(t * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function synthesize(symbol: string, n = 64): ChartPoint[] {
  const base =
    symbol === "ETH" ? 2655 : symbol === "SOL" ? 148 : symbol === "MON" ? 0.42 : 81240;
  const t0 = Math.floor(Date.now() / 1000) - n * 60;
  let p = base * 0.978;
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin(i / 5.5) * base * 0.004 + Math.cos(i / 11) * base * 0.002;
    const target = base + wave + ((i / n) * 0.018 - 0.006) * base;
    p += (target - p) * 0.18;
    return {
      t: t0 + i * 60,
      o: p,
      h: Math.max(p, base) * 1.0008,
      l: Math.min(p, base) * 0.9992,
      c: p,
      v: 40 + (i % 11) * 3,
    };
  });
}

/**
 * Pure View chart — no react-native-svg (avoids unimplemented element on old dev clients).
 * Grid + line dots + area bars + last-price rail + H/L + volume strip.
 */
export function PriceChart({
  points,
  width = 340,
  height = 240,
  showVolume = true,
  symbol = "BTC",
}: {
  points: ChartPoint[];
  width?: number;
  height?: number;
  showVolume?: boolean;
  symbol?: string;
}) {
  const data = useMemo(() => {
    if (points && points.length >= 2) return points;
    return synthesize(symbol, 64);
  }, [points, symbol]);

  const geom = useMemo(() => {
    const closes = data.map((p) => p.c);
    const highs = data.map((p) => p.h ?? p.c);
    const lows = data.map((p) => p.l ?? p.c);
    let minP = Math.min(...lows);
    let maxP = Math.max(...highs);
    if (maxP - minP < 1e-8) {
      const pad = Math.abs(maxP) * 0.002 || 1;
      minP -= pad;
      maxP += pad;
    }
    const range = maxP - minP;
    const last = closes[closes.length - 1]!;
    const up = last >= closes[0]!;
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const yFor = (p: number) => 1 - (p - minP) / range;
    const maxVol = Math.max(...data.map((p) => p.v || 0), 1);
    return {
      minP,
      maxP,
      last,
      up,
      high,
      low,
      yFor,
      maxVol,
      firstT: data[0]!.t,
      midT: data[Math.floor(data.length / 2)]!.t,
      lastT: data[data.length - 1]!.t,
      sample: data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 32)) === 0),
    };
  }, [data]);

  const stroke = geom.up ? colors.up : colors.down;
  const gridYs = [0.25, 0.5, 0.75];

  return (
    <View style={[styles.wrap, { width, height }]}>
      {/* Y labels rail */}
      <View style={styles.yRail}>
        {[1, 0.75, 0.5, 0.25, 0].map((f) => (
          <Text key={f} style={styles.yLabel}>
            {fmtPrice(geom.minP + (geom.maxP - geom.minP) * f)}
          </Text>
        ))}
      </View>

      <View style={styles.plot}>
        {gridYs.map((f) => (
          <View key={f} style={[styles.grid, { top: `${f * 100}%` }]} />
        ))}

        {/* Area columns */}
        <View style={styles.areaRow}>
          {geom.sample.map((p, i) => {
            const h = Math.max(4, geom.yFor(p.c) * 100);
            return (
              <View key={`a${i}`} style={styles.areaCol}>
                <View
                  style={{
                    width: "100%",
                    height: `${h}%`,
                    backgroundColor: stroke,
                    opacity: 0.12,
                    borderTopWidth: 2,
                    borderTopColor: stroke,
                  }}
                />
              </View>
            );
          })}
        </View>

        {/* Point dots for line feel */}
        <View style={styles.dotLayer} pointerEvents="none">
          {geom.sample.map((p, i) => (
            <View
              key={`d${i}`}
              style={[
                styles.dot,
                {
                  left: `${(i / Math.max(1, geom.sample.length - 1)) * 96}%`,
                  bottom: `${geom.yFor(p.c) * 88}%`,
                  backgroundColor: stroke,
                },
              ]}
            />
          ))}
        </View>

        {/* Last price rail */}
        <View
          style={[
            styles.lastRail,
            { bottom: `${geom.yFor(geom.last) * 88}%`, borderColor: stroke },
          ]}
        />
        <View
          style={[
            styles.lastTag,
            { bottom: `${geom.yFor(geom.last) * 88}%`, backgroundColor: stroke },
          ]}
        >
          <Text style={styles.lastTagText}>{fmtPrice(geom.last)}</Text>
        </View>

        {/* H / L */}
        <View style={[styles.hlTag, { top: 4 }]}>
          <Text style={[styles.hlText, { color: colors.up }]}>H {fmtPrice(geom.high)}</Text>
        </View>
        <View style={[styles.hlTag, { bottom: 36 }]}>
          <Text style={[styles.hlText, { color: colors.down }]}>L {fmtPrice(geom.low)}</Text>
        </View>
      </View>

      {/* Volume strip */}
      {showVolume ? (
        <View style={styles.volRow}>
          {geom.sample.map((p, i) => {
            const h = ((p.v || 0) / geom.maxVol) * 22;
            return (
              <View key={`v${i}`} style={styles.volCol}>
                <View
                  style={{
                    width: 3,
                    height: Math.max(2, h),
                    backgroundColor: stroke,
                    opacity: 0.35,
                    borderRadius: 1,
                  }}
                />
              </View>
            );
          })}
        </View>
      ) : null}

      {/* X labels */}
      <View style={styles.xRow}>
        <Text style={styles.xLabel}>{fmtTime(geom.firstT)}</Text>
        <Text style={styles.xLabel}>{fmtTime(geom.midT)}</Text>
        <Text style={styles.xLabel}>{fmtTime(geom.lastT)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#0E1014",
    borderWidth: 1,
    borderColor: "rgba(242,241,236,0.08)",
    paddingVertical: 8,
  },
  yRail: {
    position: "absolute",
    right: 6,
    top: 8,
    bottom: 52,
    justifyContent: "space-between",
    zIndex: 5,
  },
  yLabel: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 8,
    textAlign: "right",
  },
  plot: {
    flex: 1,
    marginHorizontal: 8,
    marginRight: 48,
    marginBottom: 4,
  },
  grid: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(242,241,236,0.06)",
  },
  areaRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
  },
  areaCol: { flex: 1, height: "100%", justifyContent: "flex-end" },
  dotLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  lastRail: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  lastTag: {
    position: "absolute",
    right: -40,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  lastTagText: {
    color: "#0A0B0D",
    fontFamily: type.data,
    fontSize: 8,
    fontWeight: "700",
  },
  hlTag: { position: "absolute", left: 4 },
  hlText: { fontFamily: type.data, fontSize: 9 },
  volRow: {
    height: 24,
    marginHorizontal: 8,
    marginRight: 48,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
  },
  volCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  xRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 8,
    marginRight: 48,
    marginTop: 4,
  },
  xLabel: { color: colors.muted, fontFamily: type.data, fontSize: 8 },
});
