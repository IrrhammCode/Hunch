import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, space } from "../theme";

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
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
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "brand" | "up" | "down" | "ghost";
}) {
  const bg =
    tone === "up"
      ? colors.up
      : tone === "down"
        ? colors.down
        : tone === "ghost"
          ? "transparent"
          : colors.brand;
  const fg = tone === "ghost" ? colors.ink : tone === "brand" ? "#0A0B0D" : "#0A0B0D";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        tone === "ghost" && styles.btnGhost,
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: {
    color: colors.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    color: colors.ink,
    fontFamily: "DMSans_400Regular",
    fontSize: 17,
    paddingHorizontal: space.md,
    paddingVertical: 14,
  },
  btn: {
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 16,
  },
  btnGhost: {
    borderColor: colors.line,
    borderWidth: 1,
  },
  btnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
