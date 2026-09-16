import { Link, Redirect, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth/AuthContext";
import { BrandMark } from "@/src/components/BrandMark";
import { Screen } from "@/src/components/Screen";
import { Field, PrimaryButton } from "@/src/components/ui";
import { colors, radius, space, type } from "@/src/theme";

export default function LoginScreen() {
  const {
    user,
    privyMode,
    missingPrivyConfig,
    sendOtp,
    loginWithOtp,
    loginWithEmail,
    otpStatus,
  } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Redirect href="/(app)" />;

  const sending = otpStatus === "sending-code" || otpStatus === "submitting-code";

  const onSendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      if (privyMode) {
        await sendOtp(email);
        setCodeSent(true);
      } else {
        await loginWithEmail(email);
        router.replace("/(app)");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithOtp(code, email);
      router.replace("/(app)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const showOtp = codeSent && privyMode;

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[
          styles.wrap,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 },
        ]}
      >
        {/* Brand */}
        <Animated.View entering={FadeInUp.duration(320)} style={styles.hero}>
          <BrandMark size="lg" />
          <Text style={styles.tagline}>Swipe UP or DOWN. 60s markets on Monad.</Text>
        </Animated.View>

        {/* Form */}
        <View style={styles.form}>
          {missingPrivyConfig ? (
            <View style={styles.setupBox}>
              <Text style={styles.setupTitle}>Privy not configured</Text>
              <Text style={styles.hint}>
                Copy mobile/.env.example → mobile/.env, then set EXPO_PUBLIC_PRIVY_APP_ID and
                EXPO_PUBLIC_PRIVY_CLIENT_ID from dashboard.privy.io (Email OTP + embedded wallet +
                App Client for com.hunch.app). Restart Metro after saving. For local UI only:
                EXPO_PUBLIC_USE_DEMO_AUTH=1.
              </Text>
            </View>
          ) : null}

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@email.com"
            returnKeyType={showOtp ? "next" : "go"}
            onSubmitEditing={() => {
              if (!showOtp) onSendCode();
            }}
          />

          {showOtp ? (
            <Animated.View
              key="otp"
              entering={FadeInDown.duration(240)}
              style={styles.otpBlock}
            >
              <Field
                label="Code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="123456"
                returnKeyType="go"
                onSubmitEditing={onVerify}
                maxLength={8}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton
                label={busy || sending ? "Verifying…" : "Verify & enter"}
                onPress={onVerify}
                disabled={busy || sending || !code}
              />
              <Text style={styles.hint}>Check your inbox. Code expires shortly.</Text>
            </Animated.View>
          ) : (
            <>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton
                label={
                  busy || sending ? "Sending…" : privyMode ? "Send code" : "Continue (demo)"
                }
                onPress={onSendCode}
                disabled={busy || sending || !email || missingPrivyConfig}
              />
              <Text style={styles.hint}>
                {privyMode
                  ? "Creates your embedded Monad wallet."
                  : "Demo login for local testing only."}
              </Text>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {!privyMode ? (
            <>
              <Text style={styles.footerMuted}>New here?</Text>
              <Link href="/(auth)/signup" style={styles.footerLink}>
                Create account
              </Link>
            </>
          ) : (
            <Text style={styles.footerMuted}>Same email = same wallet</Text>
          )}
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
  hero: {
    paddingTop: 28,
    gap: 14,
  },
  tagline: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 16,
    lineHeight: 22,
    maxWidth: 260,
  },
  form: { gap: space.md },
  otpBlock: { gap: space.md },
  setupBox: {
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    backgroundColor: colors.dangerDim,
    gap: 8,
  },
  setupTitle: {
    color: colors.danger,
    fontFamily: type.bold,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontFamily: type.medium,
    fontSize: 14,
  },
  hint: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 4,
  },
  footerMuted: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 15,
  },
  footerLink: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 15,
  },
});
