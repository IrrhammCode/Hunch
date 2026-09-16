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
import { colors, space, type } from "@/src/theme";

/** Demo-only signup. Privy mode routes through login OTP. */
export default function SignupScreen() {
  const { user, privyMode, signupWithEmail } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Redirect href="/(app)" />;
  if (privyMode) return <Redirect href="/(auth)/login" />;

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signupWithEmail(email, name);
      router.replace("/(app)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[
          styles.wrap,
          { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.hero}>
          <BrandMark size="lg" tag="60s UP / DOWN · Monad" />
          <Text style={styles.title}>Create your seat</Text>
        </View>

        <View style={styles.form}>
          <Field
            label="Display name"
            value={name}
            onChangeText={setName}
            placeholder="Alex"
            autoCapitalize="words"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@email.com"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label={busy ? "Creating…" : "Get started"}
            onPress={onSubmit}
            disabled={busy || !email}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerMuted}>Already in?</Text>
          <Link href="/(auth)/login" style={styles.footerLink}>
            Sign in
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
  hero: { gap: 12, paddingTop: 12 },
  title: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 48,
    letterSpacing: 1,
    marginTop: 4,
  },
  form: { gap: space.md },
  error: {
    color: colors.danger,
    fontFamily: type.medium,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  footerMuted: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 15,
  },
  footerLink: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 15,
  },
});
