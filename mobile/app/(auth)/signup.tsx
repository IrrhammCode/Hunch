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
import { BrandMark } from "@/src/components/BrandMark";
import { Screen } from "@/src/components/Screen";
import { PrimaryButton } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { MERA_RP_ID } from "@/src/auth/mera";
import { colors, radius, space, type } from "@/src/theme";

const STEPS = [
  {
    n: "01",
    title: "Create a passkey",
    body: "Face ID or fingerprint on this device. Nothing to write down.",
  },
  {
    n: "02",
    title: "Wallet is generated",
    body: "A Monad EOA is derived from the passkey. You own the keys.",
  },
  {
    n: "03",
    title: "Fund and trade",
    body: "Claim Agora AUSD, then trade Perpl perps and 60s UP/DOWN.",
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
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
          },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Icon name="arrow-back" size={20} color={colors.ink} />
            <Text style={styles.backText}>Sign in</Text>
          </Pressable>
          <BrandMark size="sm" />
        </View>

        <MockBanner />

        <Animated.View entering={FadeInUp.duration(320)} style={styles.hero}>
          <Text style={styles.eyebrow}>CREATE ACCOUNT</Text>
          <Text style={styles.headline}>One passkey{"\n"}is your wallet</Text>
          <Text style={styles.subhead}>
            No email. No seed phrase. No extension. Sign every trade with Face ID on Monad.
          </Text>
        </Animated.View>

        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <Animated.View
              key={s.n}
              entering={FadeInUp.delay(60 * i).duration(300)}
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ flex: 1 }} />

        <View style={styles.footer}>
          <PrimaryButton
            label={busy ? "Waiting for Face ID…" : "Create passkey wallet"}
            onPress={onCreate}
            disabled={busy || !meraAvailable}
          />
          <View style={styles.footerBar}>
            <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={10}>
              <Text style={styles.footerLink}>Already have a passkey? Sign in</Text>
            </Pressable>
            <Text style={styles.footerMeta}>rpId {MERA_RP_ID}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  backText: {
    color: colors.ink,
    fontFamily: type.medium,
    fontSize: 13,
  },
  hero: { gap: 8, paddingTop: 10, marginBottom: space.sm },
  eyebrow: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  headline: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 40,
    letterSpacing: 1.2,
    lineHeight: 44,
  },
  subhead: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  steps: { gap: 8 },
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
    marginTop: 2,
  },
  stepTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 14,
    marginBottom: 2,
  },
  stepBody: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    color: colors.danger,
    fontFamily: type.medium,
    fontSize: 13,
    textAlign: "center",
  },
  footer: {
    gap: 12,
    paddingTop: 8,
  },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  footerLink: {
    color: colors.brand,
    fontFamily: type.medium,
    fontSize: 13,
  },
  footerMeta: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
