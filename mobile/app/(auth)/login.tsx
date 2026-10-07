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
import { BrandMark } from "@/src/components/BrandMark";
import { Screen } from "@/src/components/Screen";
import { PrimaryButton } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { MERA_RP_ID } from "@/src/auth/mera";
import { colors, radius, space, type } from "@/src/theme";

function shortAddress(addr: string) {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function LoginScreen() {
  const {
    user,
    meraAvailable,
    isNativePasskey,
    missingAuthConfig,
    loginWithFaceId,
    savedAccount,
    forgetAccount,
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

  const hasSaved = Boolean(savedAccount?.address);

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
            <Text style={styles.headline}>
              {hasSaved ? "Welcome Back" : "Trade on Monad"}
            </Text>
            <Text style={styles.subhead}>
              {hasSaved
                ? "Unlock your wallet with Face ID / passkey to start trading."
                : "60s UP/DOWN + Perpl perps. Passkey wallet only."}
            </Text>
          </Animated.View>

          {!isNativePasskey ? (
            <View style={styles.previewNotice}>
              <Icon name="information-circle-outline" size={16} color={colors.brand} />
              <Text style={styles.previewNoticeBody}>
                Preview mode: Passkeys simulated for Web / Expo Go — Monad testnet wallet.
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

          {/* Saved Account Card (if account exists on this device) */}
          {hasSaved && savedAccount ? (
            <Animated.View entering={FadeInUp.duration(260)} style={styles.savedCard}>
              <View style={styles.savedCardLeft}>
                <View style={styles.savedIconBadge}>
                  <Icon name="finger-print" size={20} color={colors.brand} />
                </View>
                <View style={styles.savedCardMeta}>
                  <Text style={styles.savedLabel}>Saved Device Passkey</Text>
                  <Text style={styles.savedAddress}>{shortAddress(savedAccount.address)}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => forgetAccount(savedAccount.address)}
                hitSlop={12}
                style={styles.forgetBtn}
                disabled={busy}
              >
                <Text style={styles.forgetText}>Switch</Text>
              </Pressable>
            </Animated.View>
          ) : null}

          {/* Primary Action: SIGN IN */}
          <View style={styles.actions}>
            <Text style={styles.eyebrow}>
              {hasSaved ? "SECURE UNLOCK" : "SIGN IN WITH PASSKEY"}
            </Text>
            <PrimaryButton
              label={
                busy
                  ? "Verifying..."
                  : isNativePasskey
                    ? "Sign in with Face ID"
                    : "Unlock Passkey Wallet"
              }
              onPress={() =>
                run(
                  loginWithFaceId,
                  hasSaved
                    ? "Failed to unlock passkey on this device."
                    : "No passkey found on this device. Tap 'Create an account' to register.",
                )
              }
              disabled={busy || !meraAvailable}
            />
            <Text style={styles.ctaFoot}>
              {hasSaved
                ? "Signs transactions directly with your device passkey"
                : "Looks for existing passkey in Apple Keychain / device storage"}
            </Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.line} />
          </View>

          {/* Create an account section */}
          <View style={styles.signupSection}>
            <Text style={styles.signupLabel}>
              {hasSaved ? "Want to use a different wallet?" : "New to Hunch?"}
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/signup")}
              hitSlop={12}
              disabled={busy}
              style={styles.signupBtn}
            >
              <Icon name="person-add-outline" size={16} color={colors.ink} />
              <Text style={styles.signupBtnText}>Create a new account</Text>
            </Pressable>
            <Text style={styles.signupFoot}>No email or seed phrase needed</Text>
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
    maxWidth: 280,
  },
  previewNotice: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214, 255, 63, 0.35)",
    backgroundColor: "rgba(214, 255, 63, 0.08)",
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
  savedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#131A14",
    borderWidth: 1,
    borderColor: "rgba(214, 255, 63, 0.3)",
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  savedCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  savedIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(214, 255, 63, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  savedCardMeta: {
    gap: 2,
    flex: 1,
  },
  savedLabel: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
  },
  savedAddress: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  forgetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  forgetText: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 11,
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
  signupSection: {
    alignItems: "center",
    gap: 8,
  },
  signupLabel: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
  },
  signupBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgElevated,
  },
  signupBtnText: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 13,
  },
  signupFoot: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
    textAlign: "center",
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
