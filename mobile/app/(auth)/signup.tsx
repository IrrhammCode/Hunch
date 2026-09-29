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
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Icon name="arrow-back" size={20} color={colors.ink} />
            <Text style={styles.backText}>Sign in</Text>
          </Pressable>
          <BrandMark size="sm" />
        </View>

        <View style={styles.mockWrap}>
          <MockBanner />
        </View>

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

        <View style={styles.actions}>
          <PrimaryButton
            label={busy ? "Waiting for Face ID…" : "Create passkey wallet"}
            onPress={onCreate}
            disabled={busy || !meraAvailable}
          />
          <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={10}>
            <Text style={styles.secondary}>Already have a passkey? Sign in</Text>
          </Pressable>
          <Text style={styles.rpId}>rpId {MERA_RP_ID}</Text>
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
    gap: space.md,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  mockWrap: { marginTop: 2 },
  hero: { gap: 8, paddingTop: 4 },
  eyebrow: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  headline: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 42,
    letterSpacing: 1.2,
    lineHeight: 46,
  },
  subhead: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
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
    padding: space.md,
  },
  stepN: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 13,
    marginTop: 2,
  },
  stepTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 15,
    marginBottom: 2,
  },
  stepBody: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontFamily: type.medium,
    fontSize: 13,
    textAlign: "center",
  },
  actions: { gap: 12, alignItems: "center" },
  secondary: {
    color: colors.brand,
    fontFamily: type.medium,
    fontSize: 14,
  },
  rpId: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
