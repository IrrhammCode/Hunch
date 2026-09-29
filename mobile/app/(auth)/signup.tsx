import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth/AuthContext";
import { MockBanner } from "@/src/components/MockBanner";
import { Screen } from "@/src/components/Screen";
import { PrimaryButton } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { MERA_RP_ID } from "@/src/auth/mera";
import { colors, radius, space, type } from "@/src/theme";

const STEPS = [
  {
    n: "01",
    title: "Create a passkey",
    body: "Face ID on this device. Nothing to write down.",
  },
  {
    n: "02",
    title: "Wallet is generated",
    body: "Monad EOA from the passkey. You own the keys.",
  },
  {
    n: "03",
    title: "Fund and trade",
    body: "Claim AUSD, then Perpl + 60s markets.",
  },
];

export default function SignupScreen() {
  const { user, meraAvailable, loginWithMera } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Redirect href="/(app)" />;

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithMera("create");
      router.replace("/(app)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create passkey");
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
          {
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
          },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Icon name="arrow-back" size={18} color={colors.ink} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          <View style={styles.banner}>
            <MockBanner />
          </View>

          <Animated.View entering={FadeInUp.duration(300)} style={styles.hero}>
            <Text style={styles.eyebrow}>CREATE ACCOUNT</Text>
            <Text style={styles.headline}>One passkey is your wallet</Text>
            <Text style={styles.subhead}>
              No email. No seed phrase.{"\n"}Face ID signs every trade on Monad.
            </Text>
          </Animated.View>

          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <Animated.View
                key={s.n}
                entering={FadeInUp.delay(50 * i).duration(280)}
                style={styles.step}
              >
                <Text style={styles.stepN}>{s.n}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepBody}>{s.body}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={15} color={colors.danger} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label={busy ? "Waiting for Face ID..." : "Create an account"}
            onPress={onCreate}
            disabled={busy || !meraAvailable}
          />
          <View style={styles.loginRow}>
            <Text style={styles.loginLabel}>Already have a passkey?</Text>
            <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={10}>
              <Text style={styles.loginBtn}>Sign in</Text>
            </Pressable>
          </View>
          <Text style={styles.footerMeta}>{MERA_RP_ID} · MONAD 10143</Text>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  backText: {
    color: colors.ink,
    fontFamily: type.medium,
    fontSize: 13,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
  },
  banner: { marginBottom: 4 },
  hero: {
    alignItems: "center",
    gap: 8,
  },
  eyebrow: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  headline: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 36,
    letterSpacing: 1.1,
    lineHeight: 40,
    textAlign: "center",
  },
  subhead: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  steps: { gap: 10 },
  step: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    padding: 14,
  },
  stepN: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 12,
    marginTop: 3,
  },
  stepTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 14,
    marginBottom: 3,
  },
  stepBody: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dangerDim,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: colors.danger,
    fontFamily: type.medium,
    fontSize: 12,
    flex: 1,
  },
  footer: {
    gap: 12,
    paddingTop: 8,
    alignItems: "stretch",
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  loginLabel: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  loginBtn: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 13,
  },
  footerMeta: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
