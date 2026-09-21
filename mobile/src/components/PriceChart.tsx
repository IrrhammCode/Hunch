import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
  Rect,
} from "react-native-svg";
import { colors, type } from "@/src/theme";

export type ChartPoint = {
  t: number;
  o?: number;
  h?: number;
  l?: number;
  c: number;
  v?: number;
};

const PAD = { top: 14, right: 52, bottom: 28, left: 10 };

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

export function PriceChart({
  points,
  width = 340,
  height = 240,
  showVolume = true,
}: {
  points: ChartPoint[];
  width?: number;
  height?: number;
  showVolume?: boolean;
}) {
  const volH = showVolume ? 36 : 0;
  const plotH = height - PAD.top - PAD.bottom - volH;
  const plotW = width - PAD.left - PAD.right;

  const geom = useMemo(() => {
    if (!points || points.length < 2) return null;
    const closes = points.map((p) => p.c);
    const highs = points.map((p) => p.h ?? p.c);
    const lows = points.map((p) => p.l ?? p.c);
    let minP = Math.min(...lows);
    let maxP = Math.max(...highs);
    if (maxP - minP < 1e-8) {
      const pad = Math.abs(maxP) * 0.001 || 1;
      minP -= pad;
      maxP += pad;
    }
    const range = maxP - minP;
    const yFor = (p: number) => PAD.top + (1 - (p - minP) / range) * plotH;
    const xFor = (i: number) => PAD.left + (i / (points.length - 1)) * plotW;

    const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.c), p }));
    const line = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
      .join(" ");
    const area = `${line} L${coords[coords.length - 1]!.x.toFixed(2)},${(PAD.top + plotH).toFixed(2)} L${coords[0]!.x.toFixed(2)},${(PAD.top + plotH).toFixed(2)} Z`;

    const up = closes[closes.length - 1]! >= closes[0]!;
    const last = closes[closes.length - 1]!;
    const lastY = yFor(last);
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const highIdx = highs.indexOf(high);
    const lowIdx = lows.indexOf(low);

    const maxVol = Math.max(...points.map((p) => p.v || 0), 1);
    const volBase = PAD.top + plotH + 10;
    const vols = points.map((p, i) => {
      const h = ((p.v || 0) / maxVol) * (volH - 8);
      return { x: xFor(i), y: volBase + (volH - 8 - h), h: Math.max(h, 0.5) };
    });

    // 4 horizontal grid levels
    const gridYs = [0.2, 0.4, 0.6, 0.8].map((f) => ({
      y: PAD.top + plotH * f,
      price: maxP - range * f,
    }));

    return {
      line,
      area,
      up,
      last,
      lastY,
      high,
      low,
      highPt: coords[highIdx],
      lowPt: coords[lowIdx],
      vols,
      gridYs,
      minP,
      maxP,
      firstT: points[0]!.t,
      lastT: points[points.length - 1]!.t,
      midT: points[Math.floor(points.length / 2)]!.t,
    };
  }, [points, plotH, plotW, volH]);

  const stroke = geom?.up ? colors.up : colors.down;
  const fillId = geom?.up ? "gUp" : "gDown";

  return (
    <View style={[styles.wrap, { width, height }]}>
      {geom ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="gUp" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.up} stopOpacity="0.42" />
              <Stop offset="0.55" stopColor={colors.up} stopOpacity="0.1" />
              <Stop offset="1" stopColor={colors.up} stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="gDown" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.down} stopOpacity="0.42" />
              <Stop offset="0.55" stopColor={colors.down} stopOpacity="0.1" />
              <Stop offset="1" stopColor={colors.down} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* grid + y labels */}
          {geom.gridYs.map((g) => (
            <Line
              key={g.y}
              x1={PAD.left}
              y1={g.y}
              x2={PAD.left + plotW}
              y2={g.y}
              stroke="rgba(242,241,236,0.06)"
              strokeWidth={1}
            />
          ))}
          {geom.gridYs.map((g) => (
            <SvgText
              key={`l-${g.y}`}
              x={width - PAD.right + 6}
              y={g.y + 3}
              fill={colors.muted}
              fontSize={9}
              fontFamily="Menlo"
            >
              {fmtPrice(g.price)}
            </SvgText>
          ))}

          {/* area + line */}
          <Path d={geom.area} fill={`url(#${fillId})`} />
          <Path
            d={geom.line}
            stroke={stroke}
            strokeWidth={2.25}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* high / low markers */}
          {geom.highPt ? (
            <>
              <Circle cx={geom.highPt.x} cy={geom.highPt.y} r={3} fill={colors.up} />
              <SvgText
                x={Math.min(geom.highPt.x + 6, width - PAD.right - 28)}
                y={geom.highPt.y - 6}
                fill={colors.up}
                fontSize={9}
                fontFamily="Menlo"
              >
                H {fmtPrice(geom.high)}
              </SvgText>
            </>
          ) : null}
          {geom.lowPt ? (
            <>
              <Circle cx={geom.lowPt.x} cy={geom.lowPt.y} r={3} fill={colors.down} />
              <SvgText
                x={Math.min(geom.lowPt.x + 6, width - PAD.right - 28)}
                y={geom.lowPt.y + 12}
                fill={colors.down}
                fontSize={9}
                fontFamily="Menlo"
              >
                L {fmtPrice(geom.low)}
              </SvgText>
            </>
          ) : null}

          {/* last price dashed + tag */}
          <Line
            x1={PAD.left}
            y1={geom.lastY}
            x2={PAD.left + plotW}
            y2={geom.lastY}
            stroke={stroke}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.85}
          />
          <Rect
            x={width - PAD.right + 2}
            y={geom.lastY - 9}
            width={PAD.right - 4}
            height={18}
            rx={3}
            fill={stroke}
          />
          <SvgText
            x={width - PAD.right + 6}
            y={geom.lastY + 3.5}
            fill="#0A0B0D"
            fontSize={9}
            fontFamily="Menlo"
            fontWeight="700"
          >
            {fmtPrice(geom.last)}
          </SvgText>

          {/* volume */}
          {showVolume
            ? geom.vols.map((v, i) => (
                <Rect
                  key={`v${i}`}
                  x={v.x - 1.2}
                  y={v.y}
                  width={2.4}
                  height={v.h}
                  fill={geom.up ? colors.up : colors.down}
                  opacity={0.28}
                />
              ))
            : null}

          {/* x axis */}
          <SvgText x={PAD.left} y={height - 8} fill={colors.muted} fontSize={9} fontFamily="Menlo">
            {fmtTime(geom.firstT)}
          </SvgText>
          <SvgText
            x={PAD.left + plotW / 2 - 16}
            y={height - 8}
            fill={colors.muted}
            fontSize={9}
            fontFamily="Menlo"
          >
            {fmtTime(geom.midT)}
          </SvgText>
          <SvgText
            x={PAD.left + plotW - 34}
            y={height - 8}
            fill={colors.muted}
            fontSize={9}
            fontFamily="Menlo"
          >
            {fmtTime(geom.lastT)}
          </SvgText>
        </Svg>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Chart warming up</Text>
          <Text style={styles.emptyBody}>
            Waiting for price history. Latest quote still trades live.
          </Text>
        </View>
      )}
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
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 6,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 14,
  },
  emptyBody: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
    textAlign: "center",
  },
});
