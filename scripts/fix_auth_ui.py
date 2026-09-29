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
          { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.top}>
          <Animated.View entering={FadeInUp.duration(360)} style={styles.hero}>
            <BrandMark size="lg" />
            <Text style={styles.headline}>Trade on Monad</Text>
            <Text style={styles.subhead}>
              60s UP/DOWN hunches and Perpl perps. One passkey wallet â€” no seed phrase.
            </Text>
          </Animated.View>

          <View style={styles.mockWrap}>
            <MockBanner />
          </View>

          {missingAuthConfig && !meraAvailable ? (
            <Animated.View entering={FadeInDown.duration(280)} style={styles.notice}>
              <Icon name="phone-portrait-outline" size={18} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>Native build required</Text>
                <Text style={styles.noticeBody}>
                  Passkeys need the Expo dev client or TestFlight (not Expo Go).
                  rpId {MERA_RP_ID} â€” see MERA_SETUP.md.
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
              label={busy ? "Waiting for Face IDâ€¦" : "Continue with Face ID"}
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

        <Animated.View entering={FadeInUp.delay(160).duration(360)} style={styles.bottom}>
          <View style={styles.perkRow}>
            <Perk icon="key-outline" title="Passkey wallet" sub="No seed phrase" />
            <Perk icon="water-outline" title="Agora AUSD" sub="Testnet collateral" />
            <Perk icon="trending-up" title="Perpl + 60s" sub="One trading app" />
          </View>
          <Pressable onPress={() => router.push("/(auth)/signup")} hitSlop={8}>
            <Text style={styles.footerLink}>How passkey signup works</Text>
          </Pressable>
          <Text style={styles.footerMuted}>Monad testnet Â· chainId 10143</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Perk({ icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <View style={styles.perk}>
      <View style={styles.perkIcon}>
        <Icon name={icon} size={16} color={colors.brand} />
      </View>
      <Text style={styles.perkTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.perkSub} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: space.lg,
    justifyContent: "space-between",
    gap: space.lg,
  },
  top: { gap: space.md },
  hero: { gap: 10, paddingTop: 8 },
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
  mockWrap: { marginTop: 2 },
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
    gap: 12,
  },
  linkBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  linkDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.line,
  },
  linkText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 14,
  },
  ctaFoot: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 12,
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
  bottom: {
    gap: 14,
    alignItems: "center",
  },
  perkRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  perk: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgElevated,
  },
  perkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  perkTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 11,
  },
  perkSub: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 10,
  },
  footerLink: {
    color: colors.brand,
    fontFamily: type.medium,
    fontSize: 13,
  },
  footerMuted: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 0.6,
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
            label={busy ? "Waiting for Face IDâ€¦" : "Create passkey wallet"}
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
'''

root = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(auth)")
(root / "login.tsx").write_text(login, encoding="utf-8")
(root / "signup.tsx").write_text(signup, encoding="utf-8")
print("login.tsx", (root / "login.tsx").stat().st_size)
print("signup.tsx", (root / "signup.tsx").stat().st_size)
