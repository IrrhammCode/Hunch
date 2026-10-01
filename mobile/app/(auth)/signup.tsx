import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen";
import { PrimaryButton } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { MERA_RP_ID } from "@/src/auth/mera";
import { colors, radius, space, type } from "@/src/theme";

const STEPS = [
  {
    n: "01",
    title: "Create a passkey",
    body: "Face ID on this device.",
  },
  {
    n: "02",
    title: "Wallet is generated",
    body: "Monad EOA from the passkey.",
  },
  {
    n: "03",
    title: "Fund and trade",
    body: "AUSD, Perpl, 60s markets.",
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
        style={styles.wrap}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Icon name="arrow-back" size={18} color={colors.ink} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View entering={FadeInUp.duration(280)} style={styles.hero}>
            <Text style={styles.eyebrow}>CREATE ACCOUNT</Text>
            <Text style={styles.headline}>One passkey{"\n"}is your wallet</Text>
            <Text style={styles.subhead}>
              No email. No seed phrase. Face ID signs trades.
            </Text>
          </Animated.View>

          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <Animated.View
                key={s.n}
                entering={FadeInUp.delay(40 * i).duration(240)}
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
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 10) + 6,
            },
          ]}
        >
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
          <Text style={styles.footerMeta} numberOfLines={1}>
            {MERA_RP_ID} · MONAD 10143
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: space.lg,
    paddingBottom: 6,
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
    alignSelf: "flex-start",
  },
  backText: {
    color: colors.ink,
    fontFamily: type.medium,
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 14,
  },
  hero: {
    alignItems: "center",
    gap: 6,
  },
  eyebrow: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 1.4,
    textAlign: "center",
  },
  headline: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 32,
    letterSpacing: 1,
    lineHeight: 36,
    textAlign: "center",
  },
  subhead: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  steps: { gap: 8 },
  step: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    padding: 12,
  },
  stepN: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 11,
    marginTop: 2,
  },
  stepTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 13,
    marginBottom: 2,
  },
  stepBody: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 16,
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
    paddingHorizontal: space.lg,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
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
