import { View } from "react-native";
import Svg, { Line, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors } from "@/src/theme";

export type ChartPoint = { t: number; c: number };

function buildPath(points: ChartPoint[], w: number, h: number, pad = 8) {
  if (points.length < 2) return { line: "", area: "", up: true };
  const xs = points.map((p) => p.t);
  const ys = points.map((p) => p.c);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const coords = points.map((p) => {
    const x = pad + ((p.t - minX) / spanX) * (w - pad * 2);
    const y = pad + (1 - (p.c - minY) / spanY) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const area = `${line} L${last[0].toFixed(1)},${h} L${first[0].toFixed(1)},${h} Z`;
  const up = (ys[ys.length - 1] ?? 0) >= (ys[0] ?? 0);
  return { line, area, up };
}

export function PriceChart({
  points,
  width = 340,
  height = 180,
}: {
  points: ChartPoint[];
  width?: number;
  height?: number;
}) {
  const { line, area, up } = buildPath(points, width, height);
  const stroke = up ? colors.up : colors.down;
  const fillId = up ? "upFill" : "downFill";

  return (
    <View style={{ width, height, borderRadius: 12, overflow: "hidden", backgroundColor: colors.bgElevated }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="upFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.up} stopOpacity="0.35" />
            <Stop offset="1" stopColor={colors.up} stopOpacity="0.02" />
          </LinearGradient>
          <LinearGradient id="downFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.down} stopOpacity="0.35" />
            <Stop offset="1" stopColor={colors.down} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <Line
            key={f}
            x1={0}
            y1={height * f}
            x2={width}
            y2={height * f}
            stroke={colors.line}
            strokeWidth={1}
          />
        ))}
        {area ? <Path d={area} fill={`url(#${fillId})`} /> : null}
        {line ? <Path d={line} stroke={stroke} strokeWidth={2} fill="none" /> : null}
      </Svg>
    </View>
  );
}
