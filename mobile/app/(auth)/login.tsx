import * as AppleAuthentication from "expo-apple-authentication";
import { Link, Redirect, router } from "expo-router";
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
import { BrandMark } from "@/src/components/BrandMark";
import { Screen } from "@/src/components/Screen";
import { Field, PrimaryButton } from "@/src/components/ui";
import {
  PRIVY_APP_ID,
  PRIVY_CLIENT_ID,
  PRIVY_CLIENT_ID_OK,
} from "@/src/config/chain";
import { MERA_RP_ID } from "@/src/auth/mera";
import { colors, radius, space, type } from "@/src/theme";

export default function LoginScreen() {
  const {
    user,
    privyMode,
    missingPrivyConfig,
    meraAvailable,
    sendOtp,
    loginWithOtp,
    loginWithApple,
    loginWithMera,
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

  const sending =
    otpStatus === "sending-code" ||
    otpStatus === "submitting-code" ||
    otpStatus === "loading";

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

  const onMera = async (mode: "create" | "signin" | "auto") => {
    setBusy(true);
    setError(null);
    try {
      await loginWithMera(mode);
      router.replace("/(app)");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Passkey login failed — check Mera rpId association files",
      );
    } finally {
      setBusy(false);
    }
  };

  const onApple = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithApple();
      router.replace("/(app)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apple sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const showOtp = codeSent && privyMode;
  const showApple = privyMode && Platform.OS === "ios";

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[
          styles.wrap,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <Animated.View entering={FadeInUp.duration(320)} style={styles.hero}>
          <BrandMark size="lg" />
          <Text style={styles.tagline}>
            Passkey wallet · AUSD · Perpl on Monad. Swipe UP/DOWN on 60s markets.
          </Text>
        </Animated.View>

        <View style={styles.form}>
          {missingPrivyConfig ? (
            <View style={styles.setupBox}>
              <Text style={styles.setupTitle}>Privy not configured</Text>
              <Text style={styles.hint}>
                App needs EXPO_PUBLIC_PRIVY_APP_ID + EXPO_PUBLIC_PRIVY_CLIENT_ID in
                mobile/.env, then **restart Metro** (env is baked at bundle start).
              </Text>
              <Text style={styles.envLine}>
                App ID: {PRIVY_APP_ID ? `${PRIVY_APP_ID.slice(0, 6)}… set` : "EMPTY"}
              </Text>
              <Text style={styles.envLine}>
                Client ID:{" "}
                {PRIVY_CLIENT_ID
                  ? PRIVY_CLIENT_ID_OK
                    ? `${PRIVY_CLIENT_ID.slice(0, 8)}… set`
                    : "looks like a bundle id (wrong field)"
                  : "EMPTY"}
              </Text>
            </View>
          ) : null}

          <View style={styles.meraBlock}>
            <Text style={styles.meraLabel}>AGORA PATH · PASSKEY</Text>
            <PrimaryButton
              label={busy ? "Waiting for Face ID…" : "Continue with Passkey (Mera)"}
              onPress={() => onMera("auto")}
              disabled={busy || !meraAvailable}
            />
            <View style={styles.meraRow}>
              <Pressable onPress={() => onMera("create")} hitSlop={8} disabled={busy || !meraAvailable}>
                <Text style={styles.footerLink}>Create new passkey</Text>
              </Pressable>
              <Pressable onPress={() => onMera("signin")} hitSlop={8} disabled={busy || !meraAvailable}>
                <Text style={styles.footerLink}>Use existing passkey</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              {meraAvailable
                ? `rpId ${MERA_RP_ID} · EOA on Monad testnet · AUSD + Perpl`
                : "Passkeys need the native dev client (iOS/Android), not Expo Go."}
            </Text>
          </View>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or track 01 privy</Text>
            <View style={styles.orLine} />
          </View>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@email.com"
            returnKeyType={showOtp ? "next" : "go"}
            autoCapitalize="none"
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
                  busy || sending
                    ? "Sending…"
                    : privyMode
                      ? "Send code"
                      : "Continue (demo)"
                }
                onPress={onSendCode}
                disabled={busy || sending || !email || missingPrivyConfig}
              />
              {showApple ? (
                <>
                  <View style={styles.orRow}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>or</Text>
                    <View style={styles.orLine} />
                  </View>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={
                      AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                    }
                    buttonStyle={
                      AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    }
                    cornerRadius={16}
                    style={styles.appleBtn}
                    onPress={onApple}
                  />
                </>
              ) : null}
              <Text style={styles.hint}>
                {privyMode
                  ? "Email OTP or Apple · creates your embedded Monad wallet."
                  : "Demo login for local testing only."}
              </Text>
            </>
          )}
        </View>

        <View style={styles.footer}>
          {!privyMode ? (
            <>
              <Text style={styles.footerMuted}>New here?</Text>
              <Link href="/(auth)/signup" style={styles.footerLink}>
                Create account
              </Link>
            </>
          ) : (
            <Text style={styles.footerMuted}>Same identity = same wallet</Text>
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
  hero: { paddingTop: 28, gap: 14 },
  tagline: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 16,
    lineHeight: 22,
    maxWidth: 260,
  },
  form: { gap: space.md },
  meraBlock: {
    gap: 10,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.md,
    padding: space.md,
    backgroundColor: colors.brandDim,
  },
  meraLabel: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  meraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  otpBlock: { gap: space.md },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
  orText: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  appleBtn: { height: 52, width: "100%" },
  setupBox: {
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    backgroundColor: colors.dangerDim,
    gap: 8,
  },
  setupTitle: { color: colors.danger, fontFamily: type.bold, fontSize: 14 },
  envLine: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 12,
  },
  error: { color: colors.danger, fontFamily: type.medium, fontSize: 14 },
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
