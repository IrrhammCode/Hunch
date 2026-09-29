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
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
          },
        ]}
      >
        <View style={styles.center}>
          <Animated.View entering={FadeInUp.duration(320)} style={styles.hero}>
            <BrandMark size="md" />
            <Text style={styles.headline}>Trade on Monad</Text>
            <Text style={styles.subhead}>
              60s UP/DOWN + Perpl perps.{"\n"}Passkey wallet only — no seed phrase.
            </Text>
          </Animated.View>

          <View style={styles.banner}>
            <MockBanner />
          </View>

          {missingAuthConfig && !meraAvailable ? (
            <View style={styles.notice}>
              <Icon name="phone-portrait-outline" size={16} color={colors.danger} />
              <Text style={styles.noticeBody}>
                Native build required (dev client / TestFlight). See MERA_SETUP.md.
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              label={busy ? "Waiting for Face ID..." : "Create an account"}
              onPress={() => router.push("/(auth)/signup")}
              disabled={busy}
            />
            <Text style={styles.ctaFoot}>
              New passkey wallet · Agora AUSD + Perpl ready
            </Text>
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
              <Text style={styles.tertiary}>Use existing passkey instead</Text>
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={15} color={colors.danger} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
        </View>

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
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
    gap: 18,
  },
  hero: {
    alignItems: "center",
    gap: 10,
  },
  headline: {
    color: colors.ink,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 38,
    letterSpacing: 1.2,
    lineHeight: 42,
    textAlign: "center",
  },
  subhead: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  banner: { marginTop: 2 },
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
    gap: 10,
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
    marginTop: 2,
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
    paddingTop: 12,
  },
  footerMeta: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
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
'''

root = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(auth)")
(root / "login.tsx").write_text(login, encoding="utf-8")
(root / "signup.tsx").write_text(signup, encoding="utf-8")

# Perp price block — clear two-line stack, no overlap
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\src\perpl\PerpTradingTicket.tsx")
t = p.read_text(encoding="utf-8")
t = t.replace("OPEN CHART â†’".replace("â†'", "\u2192"), "OPEN CHART \u2192")
t = t.replace("OPEN CHART â†’" if False else "OPEN CHART \xc3\xa2\xe2\x80\x99", "OPEN CHART")
# normalize any leftover mojibake arrows
for bad, good in [("OPEN CHART â†’" , "OPEN CHART"), ("Perpl Â· Monad", "Perpl \u00b7 Monad")]:
    t = t.replace(bad, good)
old_block = '''        <View style={styles.priceBlock}>
          <Text style={styles.bigPrice} numberOfLines={1}>
            ${currentMark.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={styles.priceMetaRow}>
            <Text
              style={[
                styles.bigDelta,
                currentMark.change24hPct >= 0 ? { color: colors.up } : { color: colors.down },
              ]}
            >
              {currentMark.change24hPct >= 0 ? "+" : ""}
              {currentMark.change24hPct.toFixed(2)}%
            </Text>
            <Text style={styles.pythFeedText}>Perpl \u00b7 Monad</Text>
          </View>
        </View>'''
new_block = '''        <View style={styles.priceBlock}>
          <Text style={styles.bigPrice} numberOfLines={1} adjustsFontSizeToFit>
            {"$" + currentMark.markPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View style={styles.priceMetaRow}>
            <Text
              style={[
                styles.bigDelta,
                currentMark.change24hPct >= 0 ? { color: colors.up } : { color: colors.down },
              ]}
            >
              {currentMark.change24hPct >= 0 ? "+" : ""}
              {currentMark.change24hPct.toFixed(2)}%
            </Text>
            <View style={styles.metaDot} />
            <Text style={styles.pythFeedText}>Perpl</Text>
            <View style={styles.metaDot} />
            <Text style={styles.pythFeedText}>Monad</Text>
          </View>
        </View>'''
if old_block not in t:
    # try without escaped middot
    old2 = old_block.replace("\\u00b7", "\u00b7")
    if old2 in t:
        t = t.replace(old2, new_block.replace("\\u00b7", "\u00b7") if False else new_block)
    else:
        print("price block not found exact")
else:
    t = t.replace(old_block, new_block)

# styles
t = t.replace(
    "  priceBlock: {\n    gap: 4,\n    marginTop: 6,\n  },",
    "  priceBlock: {\n    gap: 6,\n    marginTop: 10,\n  },",
)
t = t.replace(
    "  bigPrice: {\n    color: colors.ink,\n    fontFamily: type.data,\n    fontSize: 26,\n    fontWeight: \"700\",\n    flexShrink: 1,\n  },",
    "  bigPrice: {\n    color: colors.ink,\n    fontFamily: type.data,\n    fontSize: 30,\n    fontWeight: \"700\",\n    letterSpacing: -0.5,\n  },",
)
t = t.replace(
    "  priceMetaRow: {\n    flexDirection: \"row\",\n    alignItems: \"center\",\n    gap: 8,\n    marginTop: 2,\n  },",
    "  priceMetaRow: {\n    flexDirection: \"row\",\n    alignItems: \"center\",\n    gap: 6,\n    marginTop: 2,\n  },\n  metaDot: {\n    width: 3,\n    height: 3,\n    borderRadius: 2,\n    backgroundColor: colors.line,\n  },",
)
p.write_text(t, encoding="utf-8")
print("done")
