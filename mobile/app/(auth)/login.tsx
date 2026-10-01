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
import { MockBanner } from "@/src/components/MockBanner";
import { BrandMark } from "@/src/components/BrandMark";
import { Screen } from "@/src/components/Screen";
import { PrimaryButton } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { MERA_RP_ID } from "@/src/auth/mera";
import { colors, radius, space, type } from "@/src/theme";

export default function LoginScreen() {
  const {
    user,
    meraAvailable,
    isNativePasskey,
    missingAuthConfig,
    loginWithMera,
    loginWithFaceId,
  } = useAuth();
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
        style={styles.wrap}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 20,
              paddingBottom: 16,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View entering={FadeInUp.duration(300)} style={styles.hero}>
            <BrandMark size="md" />
            <Text style={styles.headline}>Trade on Monad</Text>
            <Text style={styles.subhead}>
              60s UP/DOWN + Perpl perps. Passkey wallet only.
            </Text>
          </Animated.View>

          <View style={styles.block}>
            <MockBanner />
          </View>

          {!isNativePasskey ? (
            <View style={styles.previewNotice}>
              <Icon name="information-circle-outline" size={16} color={colors.brand} />
              <Text style={styles.previewNoticeBody}>
                Preview mode: Passkeys simulated for Web / Expo Go — using Monad testnet wallet.
              </Text>
            </View>
          ) : null}

          {missingAuthConfig && !meraAvailable ? (
            <View style={styles.notice}>
              <Icon name="phone-portrait-outline" size={16} color={colors.danger} />
              <Text style={styles.noticeBody}>
                Native build required (dev client / TestFlight). See MERA_SETUP.md.
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Text style={styles.eyebrow}>NEW HERE</Text>
            <PrimaryButton
              label={busy ? "Waiting for Face ID..." : "Create an account"}
              onPress={() => router.push("/(auth)/signup")}
              disabled={busy}
            />
            <Text style={styles.ctaFoot}>Passkey wallet in one Face ID</Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.secondaryWrap}>
            <Text style={styles.loginLabel}>Already have a passkey?</Text>
            <Pressable
              onPress={() => run(loginWithFaceId, "Face ID / passkey failed")}
              hitSlop={12}
              disabled={busy || !meraAvailable}
              style={styles.loginBtn}
            >
              <Icon name="finger-print" size={16} color={colors.brand} />
              <Text style={styles.loginBtnText}>
                {busy ? "..." : "Sign in with Face ID"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => run(() => loginWithMera("signin"), "Could not use passkey")}
              hitSlop={10}
              disabled={busy || !meraAvailable}
            >
              <Text style={styles.tertiary}>Use existing passkey</Text>
            </Pressable>
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
            styles.footerBar,
            { paddingBottom: Math.max(insets.bottom, 10) + 4 },
          ]}
        >
          <Text style={styles.footerMeta}>MONAD TESTNET · 10143</Text>
          <Text style={styles.footerMeta} numberOfLines={1}>
            {MERA_RP_ID}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    gap: 16,
  },
  hero: {
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  headline: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 34,
    letterSpacing: 1.1,
    lineHeight: 38,
    textAlign: "center",
  },
  subhead: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 260,
  },
  block: { gap: 8 },
  previewNotice: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 179, 0, 0.35)",
    backgroundColor: "rgba(255, 179, 0, 0.08)",
    borderRadius: radius.sm,
    padding: 12,
  },
  previewNoticeBody: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  notice: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,107,74,0.4)",
    backgroundColor: colors.dangerDim,
    borderRadius: radius.sm,
    padding: 12,
  },
  noticeBody: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  actions: {
    gap: 8,
  },
  eyebrow: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  ctaFoot: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
    textAlign: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  dividerText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  secondaryWrap: {
    alignItems: "center",
    gap: 10,
  },
  loginLabel: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 220,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgElevated,
  },
  loginBtnText: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 14,
  },
  tertiary: {
    color: colors.brand,
    fontFamily: type.medium,
    fontSize: 12,
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
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  footerMeta: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
    letterSpacing: 0.5,
    maxWidth: "55%",
    textAlign: "right",
  },
});
