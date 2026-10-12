import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
    loginAsReviewer,
    savedAccount,
    forgetAccount,
  } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [reviewerUser, setReviewerUser] = useState("reviewer@hunch.app");
  const [reviewerPass, setReviewerPass] = useState("AppleReview2026!");

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

          {/* Apple Reviewer / Demonstration Access Card */}
          <View style={styles.reviewerSection}>
            <Pressable
              onPress={() => setShowReviewerModal(true)}
              hitSlop={12}
              disabled={busy}
              style={styles.reviewerCard}
            >
              <View style={styles.reviewerCardLeft}>
                <View style={styles.reviewerBadge}>
                  <Icon name="shield-checkmark" size={16} color={colors.brand} />
                </View>
                <View style={styles.reviewerCardMeta}>
                  <Text style={styles.reviewerCardTitle}>App Review & Demo Sign-In</Text>
                  <Text style={styles.reviewerCardSub}>
                    Username & password review credentials
                  </Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={16} color={colors.muted} />
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

      {/* Reviewer / Demo Credentials Modal */}
      <Modal
        visible={showReviewerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReviewerModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.modalDismissOverlay}
            onPress={() => setShowReviewerModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Icon name="shield-checkmark" size={18} color={colors.brand} />
                <Text style={styles.modalTitle}>App Review & Demo Sign-In</Text>
              </View>
              <Pressable
                onPress={() => setShowReviewerModal(false)}
                hitSlop={12}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={styles.modalDesc}>
              Use the demo credentials provided in TestFlight Beta App Review Information to evaluate all features on Monad Testnet.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>USER NAME</Text>
              <TextInput
                style={styles.textInput}
                value={reviewerUser}
                onChangeText={setReviewerUser}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="reviewer@hunch.app"
                placeholderTextColor={colors.muted}
                editable={!busy}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TextInput
                style={styles.textInput}
                value={reviewerPass}
                onChangeText={setReviewerPass}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={false}
                placeholder="AppleReview2026!"
                placeholderTextColor={colors.muted}
                editable={!busy}
              />
            </View>

            <View style={styles.modalNotice}>
              <Icon name="wallet-outline" size={15} color={colors.brand} />
              <Text style={styles.modalNoticeText}>
                Pre-funded demo wallet (10,000 AUSD testnet balance) on Monad Testnet. Bypasses device biometrics for review.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                label={busy ? "Signing In..." : "Sign In to Demo Account"}
                onPress={async () => {
                  setShowReviewerModal(false);
                  await run(loginAsReviewer, "Demo review login failed");
                }}
                disabled={busy}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  reviewerSection: {
    marginTop: 4,
  },
  reviewerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(214, 255, 63, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(214, 255, 63, 0.25)",
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reviewerCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  reviewerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(214, 255, 63, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewerCardMeta: {
    gap: 2,
    flex: 1,
  },
  reviewerCardTitle: {
    color: colors.ink,
    fontFamily: type.medium,
    fontSize: 13,
  },
  reviewerCardSub: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  modalDismissOverlay: {
    ...StyleSheet.absoluteFill,
  },
  modalContent: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: space.lg,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 20,
    letterSpacing: 0.8,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDesc: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 17,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    fontFamily: type.medium,
    fontSize: 13,
  },
  modalNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(214, 255, 63, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(214, 255, 63, 0.25)",
    borderRadius: radius.sm,
    padding: 10,
  },
  modalNoticeText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  modalActions: {
    marginTop: 4,
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
