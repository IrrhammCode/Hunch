import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { colors, radius, space, type } from "../theme";
import { Icon } from "./Icon";

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = "brand",
  compact,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "brand" | "up" | "down" | "ghost";
  compact?: boolean;
}) {
  const bg =
    tone === "up"
      ? colors.up
      : tone === "down"
        ? colors.down
        : tone === "ghost"
          ? "transparent"
          : colors.brand;
  const fg = tone === "ghost" ? colors.ink : "#0A0B0D";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.35 : pressed ? 0.88 : 1,
        },
        tone === "ghost" && styles.btnGhost,
      ]}
    >
      <Text style={[styles.btnText, compact && styles.btnTextCompact, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function AmountChip({
  value,
  selected,
  onPress,
}: {
  value: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.amountChip,
        selected && styles.amountChipOn,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.amountText, selected && styles.amountTextOn]}>{value}</Text>
    </Pressable>
  );
}

export function BalanceChip({ label }: { label: string }) {
  return (
    <View style={styles.balanceChip}>
      <Text style={styles.balanceText}>{label}</Text>
    </View>
  );
}

export function StatusPill({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "muted" | "up" | "down" | "brand";
}) {
  const map = {
    muted: { bg: "rgba(139,142,151,0.18)", fg: colors.muted, border: colors.line },
    up: { bg: "rgba(46,229,157,0.18)", fg: colors.up, border: "rgba(46,229,157,0.45)" },
    down: { bg: "rgba(255,77,106,0.18)", fg: colors.down, border: "rgba(255,77,106,0.45)" },
    brand: { bg: colors.brandDim, fg: colors.brand, border: "rgba(214,255,63,0.4)" },
  }[tone];

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: map.bg, borderColor: map.border, borderWidth: 1 },
      ]}
    >
      <Text style={[styles.pillText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  glyph,
  icon = "trending-up",
}: {
  title: string;
  body: string;
  glyph?: string;
  icon?: "trending-up" | "time-outline" | "wallet-outline" | "flash";
}) {
  return (
    <View style={styles.empty}>
      {glyph ? (
        <Text style={styles.emptyGlyph}>{glyph}</Text>
      ) : (
        <Icon name={icon} size={28} color={colors.brand} />
      )}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 17,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    flexShrink: 1,
  },
  btn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    paddingVertical: 16,
    minHeight: 52,
  },
  btnCompact: {
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: radius.md,
  },
  btnGhost: {
    borderColor: colors.line,
    borderWidth: 1,
  },
  btnText: {
    fontFamily: type.bold,
    fontSize: 15,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  btnTextCompact: { fontSize: 13 },
  amountChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.bgElevated,
    minWidth: 56,
    alignItems: "center",
  },
  amountChipOn: {
    borderColor: colors.brand,
    backgroundColor: colors.brandDim,
  },
  amountText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 14,
  },
  amountTextOn: { color: colors.brand },
  balanceChip: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  balanceText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  pillText: {
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  empty: {
    borderRadius: radius.lg,
    padding: space.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  emptyGlyph: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 14,
    letterSpacing: 2,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 17,
  },
  emptyBody: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
