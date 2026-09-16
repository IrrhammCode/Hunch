/**
 * Hunch design tokens — dark arena, acid lime brand, UP/DOWN signals.
 * Linear/Ramp register: dense, tactile, no casino chrome.
 */
export const colors = {
  bg: "#0A0B0D",
  bgElevated: "#12141A",
  bgCard: "rgba(18, 20, 26, 0.94)",
  ink: "#F2F1EC",
  muted: "#8B8E97",
  line: "rgba(242,241,236,0.10)",
  lineStrong: "rgba(242,241,236,0.18)",
  brand: "#D6FF3F",
  brandDim: "rgba(214,255,63,0.14)",
  brandSoft: "rgba(214,255,63,0.08)",
  up: "#2EE59D",
  upDim: "rgba(46,229,157,0.14)",
  down: "#FF4D6A",
  downDim: "rgba(255,77,106,0.14)",
  danger: "#FF6B4A",
  dangerDim: "rgba(255,107,74,0.12)",
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 28,
  pill: 999,
} as const;

export const type = {
  /** Giant countdown / brand display */
  display: {
    fontFamily: "BebasNeue_400Regular",
    letterSpacing: 1.5,
  },
  /** Screen titles YOU / BOOK */
  title: {
    fontFamily: "BebasNeue_400Regular",
    letterSpacing: 1,
  },
  body: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  bold: "DMSans_700Bold",
} as const;
