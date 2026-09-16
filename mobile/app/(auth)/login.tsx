import { Link, Redirect, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth/AuthContext";
import { BrandMark } from "@/src/components/BrandMark";
import { Screen } from "@/src/components/Screen";
import { Field, PrimaryButton } from "@/src/components/ui";
import { colors, space } from "@/src/theme";

export default function LoginScreen() {
  const { user, loginWithEmail } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Redirect href="/(app)" />;

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithEmail(email);
      router.replace("/(app)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.wrap, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.hero}>
          <BrandMark />
          <Text style={styles.line}>One hunch. Sixty seconds. No clutter.</Text>
        </View>

        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@email.com"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label={busy ? "Signing in…" : "Continue"} onPress={onSubmit} disabled={busy || !email} />
          <Text style={styles.hint}>
            Demo login for now — Privy email OTP + Face ID hooks in next. Same email = same session.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerMuted}>New here?</Text>
          <Link href="/(auth)/signup" style={styles.footerLink}>
            Create account
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: space.lg,
    justifyContent: "space-between",
  },
  hero: { gap: 18, paddingTop: 24 },
  line: {
    color: colors.ink,
    fontFamily: "DMSans_400Regular",
    fontSize: 18,
    lineHeight: 26,
    maxWidth: 280,
  },
  form: { gap: space.md },
  error: {
    color: colors.danger,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  hint: {
    color: colors.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  footerMuted: {
    color: colors.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
  },
  footerLink: {
    color: colors.brand,
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
  },
});
