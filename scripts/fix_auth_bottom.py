from pathlib import Path

login = r'''import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
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
            paddingTop: insets.top + 24,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
          },
        ]}
      >
        <View style={styles.main}>
          <Animated.View entering={FadeInUp.duration(360)} style={styles.hero}>
            <BrandMark size="lg" />
            <Text style={styles.headline}>Trade on Monad</Text>
            <Text style={styles.subhead}>
              60s UP/DOWN hunches and Perpl perps. One passkey wallet — no seed phrase.
            </Text>
          </Animated.View>

          <MockBanner />

          {missingAuthConfig && !meraAvailable ? (
            <Animated.View entering={FadeInDown.duration(280)} style={styles.notice}>
              <Icon name="phone-portrait-outline" size={18} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>Native build required</Text>
                <Text style={styles.noticeBody}>
                  Passkeys need the Expo dev client or TestFlight (not Expo Go).
                  rpId {MERA_RP_ID} — see MERA_SETUP.md.
                </Text>
              </View>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInUp.delay(80).duration(360)} style={styles.ctaCard}>
            <View style={styles.ctaHead}>
              <Text style={styles.ctaEyebrow}>SIGN IN</Text>
              <View style={styles.securePill}>
                <Icon name="shield-checkmark" size={12} color={colors.brand} />
                <Text style={styles.securePillText}>DEVICE SECURED</Text>
              </View>
            </View>

            <PrimaryButton
              label={busy ? "Waiting for Face ID…" : "Continue with Face ID"}
              onPress={() => run(loginWithFaceId, "Face ID / passkey failed")}
              disabled={busy || !meraAvailable}
            />

            <View style={styles.linkRow}>
              <Pressable
                onPress={() => run(() => loginWithMera("create"), "Could not create passkey")}
                hitSlop={10}
                disabled={busy || !meraAvailable}
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>Create passkey</Text>
              </Pressable>
              <View style={styles.linkDivider} />
              <Pressable
                onPress={() => run(() => loginWithMera("signin"), "Could not use passkey")}
                hitSlop={10}
                disabled={busy || !meraAvailable}
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>Use existing</Text>
              </Pressable>
            </View>

            <Text style={styles.ctaFoot}>
              Face ID or fingerprint unlocks your wallet on this device.
            </Text>
          </Animated.View>

          {error ? (
            <Animated.View entering={FadeInDown.duration(200)} style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.error}>{error}</Text>
            </Animated.View>
          ) : null}
        </View>

        {/* Bottom chrome — one strip + one footer line */}
        <View style={styles.footer}>
          <View style={styles.trustRow}>
            <TrustItem icon="key-outline" label="Passkey wallet" />
            <View style={styles.dot} />
            <TrustItem icon="water-outline" label="Agora AUSD" />
            <View style={styles.dot} />
            <TrustItem icon="trending-up" label="Perpl + 60s" />
          </View>
          <View style={styles.footerBar}>
            <Pressable
              onPress={() => router.push("/(auth)/signup")}
              hitSlop={10}
              style={styles.footerLinkHit}
            >
              <Text style={styles.footerLink}>Create an account</Text>
            </Pressable>
            <Text style={styles.footerMeta}>MONAD TESTNET · 10143</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function TrustItem({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.trustItem}>
      <Icon name={icon} size={13} color={colors.muted} />
      <Text style={styles.trustText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  main: {
    flex: 1,
    gap: space.md,
    justifyContent: "center",
    paddingBottom: space.md,
  },
  hero: { gap: 10, marginBottom: 4 },
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
    maxWidth: 300,
  },
  notice: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,107,74,0.45)",
    backgroundColor: colors.dangerDim,
    borderRadius: radius.md,
    padding: space.md,
  },
  noticeTitle: {
    color: colors.danger,
    fontFamily: type.bold,
    fontSize: 13,
    marginBottom: 2,
  },
  noticeBody: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 17,
  },
  ctaCard: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    padding: space.md,
    gap: 12,
  },
  ctaHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaEyebrow: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  securePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandDim,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  securePillText: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  linkBtn: { paddingVertical: 4, paddingHorizontal: 6 },
  linkDivider: {
    width: 1,
    height: 11,
    backgroundColor: colors.line,
  },
  linkText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 13,
  },
  ctaFoot: {
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
    fontSize: 13,
    flex: 1,
  },
  footer: {
    gap: 10,
    paddingTop: 10,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 2,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trustText: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 11,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.line,
  },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 12,
    paddingBottom: 2,
  },
  footerLinkHit: {
    paddingVertical: 4,
  },
  footerLink: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 13,
  },
  footerMeta: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 0.7,
  },
});
'''

signup = r'''import { Redirect, router } from "expo-router";
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
'''

root = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(auth)")
(root / "login.tsx").write_text(login, encoding="utf-8")
(root / "signup.tsx").write_text(signup, encoding="utf-8")
print("ok", (root / "login.tsx").stat().st_size, (root / "signup.tsx").stat().st_size)
