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

function synthesize(symbol: string, n = 72): ChartPoint[] {
  const base =
    symbol === "ETH" ? 2655 : symbol === "SOL" ? 148 : symbol === "MON" ? 0.42 : 81240;
  const t0 = Math.floor(Date.now() / 1000) - n * 60;
  let p = base * 0.972;
  return Array.from({ length: n }, (_, i) => {
    const wave =
      Math.sin(i / 4.2) * base * 0.0055 + Math.cos(i / 9.5) * base * 0.003 + Math.sin(i / 17) * base * 0.002;
    const trend = ((i / n) * 0.028 - 0.01) * base;
    const target = base + wave + trend;
    p += (target - p) * 0.14;
    const o = p;
    const c = p + Math.sin(i * 1.3) * base * 0.0004;
    return {
      t: t0 + i * 60,
      o,
      h: Math.max(o, c) * 1.0015,
      l: Math.min(o, c) * 0.9985,
      c,
      v: 28 + Math.abs(Math.sin(i / 3)) * 42 + (i % 5) * 4,
    };
  });
}

type Seg = { left: number; top: number; width: number; angle: number };
type Pt = { x: number; y: number };

function buildGeometry(data: ChartPoint[], w: number, h: number) {
  const padT = 10;
  const padB = 6;
  const plotH = h - padT - padB;
  const closes = data.map((p) => p.c);
  const highs = data.map((p) => p.h ?? p.c);
  const lows = data.map((p) => p.l ?? p.c);
  let minP = Math.min(...lows);
  let maxP = Math.max(...highs);
  if (maxP - minP < 1e-8) {
    const pad = Math.abs(maxP) * 0.0025 || 1;
    minP -= pad;
    maxP += pad;
  }
  const range = maxP - minP;
  const yFor = (price: number) => padT + (1 - (price - minP) / range) * plotH;
  const xFor = (i: number) => (i / Math.max(1, data.length - 1)) * w;

  const pts: Pt[] = data.map((p, i) => ({ x: xFor(i), y: yFor(p.c) }));

  const segs: Seg[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) continue;
    segs.push({
      left: a.x + dx / 2 - len / 2,
      top: a.y + dy / 2 - 1,
      width: len,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    });
  }

  // continuous area under line — one column per point, no gaps
  const area = data.map((p, i) => ({
    x: xFor(i),
    h: Math.max(1, (p.c - minP) / range) * plotH,
  }));

  const last = closes[closes.length - 1]!;
  const up = last >= closes[0]!;
  const maxVol = Math.max(...data.map((p) => p.v || 0), 1);

  return {
    minP,
    maxP,
    last,
    lastY: yFor(last),
    up,
    high: Math.max(...highs),
    low: Math.min(...lows),
    highY: yFor(Math.max(...highs)),
    lowY: yFor(Math.min(...lows)),
    pts,
    segs,
    area,
    maxVol,
    padT,
    plotH,
    firstT: data[0]!.t,
    midT: data[Math.floor(data.length / 2)]!.t,
    lastT: data[data.length - 1]!.t,
  };
}

/**
 * Pure View trading chart (no SVG).
 * Connected price line · soft area · last-price rail · H/L · volume · axis labels.
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
    const src = points && points.length >= 2 ? points : synthesize(symbol, 72);
    // cap vertices for smooth but cheap layout
    if (src.length > 80) {
      const step = src.length / 80;
      return src.filter((_, i) => i % Math.round(step) === 0 || i === src.length - 1);
    }
    return src;
  }, [points, symbol]);

  const geom = useMemo(
    () => buildGeometry(data, width - 52, height - (showVolume ? 46 : 28)),
    [data, width, height, showVolume],
  );

  const stroke = geom.up ? colors.up : colors.down;
  const areaW = width - 52;
  const plotH = height - (showVolume ? 46 : 28);

  return (
    <View style={[styles.wrap, { width, height }]}>
      <View style={styles.bodyRow}>
        <View style={[styles.plot, { width: areaW, height: plotH }]}>
          {/* horizontal grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <View key={f} style={[styles.gridLine, { top: 2 + f * (plotH - 8) }]} />
          ))}

          {/* soft area fill */}
          <View style={styles.areaLayer} pointerEvents="none">
            {geom.area.map((a, i) => (
              <View
                key={`a${i}`}
                style={{
                  position: "absolute",
                  left: a.x - 1.2,
                  bottom: 2,
                  width: 2.4,
                  height: a.h * 0.92,
                  backgroundColor: stroke,
                  opacity: 0.1,
                }}
              />
            ))}
            {/* denser glow near line */}
            {geom.area.map((a, i) => (
              <View
                key={`g${i}`}
                style={{
                  position: "absolute",
                  left: a.x - 1.5,
                  bottom: 2 + a.h * 0.92 - 3,
                  width: 3,
                  height: 5,
                  backgroundColor: stroke,
                  opacity: 0.18,
                  borderRadius: 1,
                }}
              />
            ))}
          </View>

          {/* connected price line */}
          <View style={styles.lineLayer} pointerEvents="none">
            {geom.segs.map((s, i) => (
              <View
                key={`s${i}`}
                style={{
                  position: "absolute",
                  left: s.left,
                  top: s.top,
                  width: s.width,
                  height: 2.25,
                  borderRadius: 1,
                  backgroundColor: stroke,
                  transform: [{ rotate: `${s.angle}deg` }],
                }}
              />
            ))}
            {/* last point cap */}
            <View
              style={[
                styles.endCap,
                {
                  left: geom.pts[geom.pts.length - 1]!.x - 3.5,
                  top: geom.pts[geom.pts.length - 1]!.y - 3.5,
                  backgroundColor: stroke,
                  borderColor: "#0E1014",
                },
              ]}
            />
          </View>

          {/* last price dashed rail + tag */}
          <View
            style={[
              styles.lastRail,
              { top: geom.lastY, borderStyle: "dashed", borderColor: stroke },
            ]}
          />
          <View style={[styles.lastTag, { top: geom.lastY - 10, backgroundColor: stroke }]}>
            <Text style={styles.lastTagText}>{fmtPrice(geom.last)}</Text>
          </View>

          {/* H / L pills */}
          <View style={[styles.hlPill, { top: 2 }]}>
            <Text style={[styles.hlText, { color: colors.up }]}>H {fmtPrice(geom.high)}</Text>
          </View>
          <View style={[styles.hlPill, { top: plotH - 22 }]}>
            <Text style={[styles.hlText, { color: colors.down }]}>L {fmtPrice(geom.low)}</Text>
          </View>
        </View>

        {/* Y axis */}
        <View style={[styles.yRail, { height: plotH }]}>
          {[1, 0.75, 0.5, 0.25, 0].map((f) => (
            <Text key={f} style={styles.yLabel}>
              {fmtPrice(geom.minP + (geom.maxP - geom.minP) * f)}
            </Text>
          ))}
        </View>
      </View>

      {showVolume ? (
        <View style={[styles.volWrap, { width: areaW }]}>
          {data.map((p, i) => {
            const h = Math.max(2, ((p.v || 0) / geom.maxVol) * 28);
            const col = (p.c ?? 0) >= (p.o ?? p.c) ? colors.up : colors.down;
            return (
              <View key={`v${i}`} style={styles.volCol}>
                <View
                  style={{
                    width: Math.max(2, areaW / data.length - 1.5),
                    height: h,
                    backgroundColor: col,
                    opacity: 0.28,
                    borderRadius: 1.5,
                  }}
                />
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.xRow, { width: areaW }]}>
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
    backgroundColor: "#0B0D11",
    borderWidth: 1,
    borderColor: "rgba(242,241,236,0.08)",
    paddingTop: 8,
    paddingBottom: 6,
  },
  bodyRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    gap: 4,
  },
  plot: {
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(242,241,236,0.055)",
  },
  areaLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  lineLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  endCap: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  lastRail: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    opacity: 0.85,
  },
  lastTag: {
    position: "absolute",
    right: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  lastTagText: {
    color: "#0A0B0D",
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "700",
  },
  hlPill: {
    position: "absolute",
    left: 2,
    backgroundColor: "rgba(14,16,20,0.85)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  hlText: {
    fontFamily: type.data,
    fontSize: 9,
  },
  yRail: {
    width: 44,
    justifyContent: "space-between",
    paddingTop: 2,
  },
  yLabel: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 8,
    textAlign: "right",
  },
  volWrap: {
    height: 32,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    marginTop: 2,
    gap: 0,
  },
  volCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  xRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginTop: 4,
  },
  xLabel: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 8,
  },
});
