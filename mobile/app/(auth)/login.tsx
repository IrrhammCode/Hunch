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

export default function LoginScreen() {
  const { user, meraAvailable, missingAuthConfig, loginWithMera, loginWithFaceId } =
    useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Redirect href="/(app)" />;

  const run = async (fn: () => Promise<void>, failMsg: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.replace("/(app)");
    } catch (e) {
      setError(e instanceof Error ? e.message : failMsg);
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
            paddingTop: insets.top + 20,
            paddingBottom: Math.max(insets.bottom, 10) + 6,
          },
        ]}
      >
        <Animated.View entering={FadeInUp.duration(320)} style={styles.hero}>
          <BrandMark size="md" />
          <Text style={styles.headline}>Trade on Monad</Text>
          <Text style={styles.subhead}>
            60s UP/DOWN + Perpl perps. Passkey wallet only — no seed phrase.
          </Text>
        </Animated.View>

        <MockBanner />

        {missingAuthConfig && !meraAvailable ? (
          <View style={styles.notice}>
            <Icon name="phone-portrait-outline" size={16} color={colors.danger} />
            <Text style={styles.noticeBody}>
              Use the native dev client / TestFlight (not Expo Go). See MERA_SETUP.md.
            </Text>
          </View>
        ) : null}

        {/* PRIMARY = Create account */}
        <View style={styles.ctaCard}>
          <PrimaryButton
            label={busy ? "Waiting for Face ID..." : "Create an account"}
            onPress={() => router.push("/(auth)/signup")}
            disabled={busy}
          />
          <Text style={styles.ctaFoot}>
            New passkey wallet in one Face ID · Agora AUSD + Perpl ready
          </Text>
        </View>

        {/* SECONDARY = Login */}
        <View style={styles.loginRow}>
          <Text style={styles.loginLabel}>Already have a passkey?</Text>
          <Pressable
            onPress={() => run(loginWithFaceId, "Face ID / passkey failed")}
            hitSlop={10}
            disabled={busy || !meraAvailable}
            style={styles.loginBtn}
          >
            <Text style={styles.loginBtnText}>
              {busy ? "..." : "Sign in with Face ID"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => run(() => loginWithMera("signin"), "Could not use passkey")}
          hitSlop={8}
          disabled={busy || !meraAvailable}
        >
          <Text style={styles.tertiary}>Use existing passkey</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ flex: 1 }} />

        <View style={styles.footerBar}>
          <Text style={styles.footerMeta}>MONAD TESTNET · 10143</Text>
          <Text style={styles.footerMeta}>{MERA_RP_ID}</Text>
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
  hero: { gap: 8, marginBottom: 4 },
  headline: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 36,
    letterSpacing: 1,
    lineHeight: 40,
  },
  subhead: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
  },
  notice: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,107,74,0.4)",
    backgroundColor: colors.dangerDim,
    borderRadius: radius.sm,
    padding: 10,
  },
  noticeBody: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  ctaCard: {
    gap: 8,
  },
  ctaFoot: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
    textAlign: "center",
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
  },
  loginLabel: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  loginBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgElevated,
  },
  loginBtnText: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 13,
  },
  tertiary: {
    color: colors.brand,
    fontFamily: type.medium,
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  error: {
    color: colors.danger,
    fontFamily: type.medium,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  footerMeta: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
    letterSpacing: 0.6,
  },
});
