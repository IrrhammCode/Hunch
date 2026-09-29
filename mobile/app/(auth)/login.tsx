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
    missingAuthConfig,
    loginWithMera,
    loginWithFaceId,
  } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Redirect href="/(app)" />;

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
          : "Passkey failed — host AASA/assetlinks and use a native build (see MERA_SETUP.md)",
      );
    } finally {
      setBusy(false);
    }
  };

  const onFaceId = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithFaceId();
      router.replace("/(app)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Face ID / passkey failed");
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
          { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <Animated.View entering={FadeInUp.duration(320)} style={styles.hero}>
          <BrandMark size="lg" />
          <Text style={styles.tagline}>
            Passkey wallet · AUSD · Perpl on Monad. Swipe UP/DOWN on 60s markets.
          </Text>
        </Animated.View>

        <View style={styles.form}>
          <MockBanner />

          {missingAuthConfig && !meraAvailable ? (
            <View style={styles.setupBox}>
              <Text style={styles.setupTitle}>Passkeys need a native build</Text>
              <Text style={styles.hint}>
                Use the Expo dev client / TestFlight (not Expo Go). rpId{" "}
                {MERA_RP_ID} — host AASA + assetlinks (MERA_SETUP.md).
              </Text>
            </View>
          ) : null}

          <View style={styles.meraBlock}>
            <Text style={styles.meraLabel}>ONE LOGIN · MERA PASSKEY</Text>
            <PrimaryButton
              label={busy ? "Waiting for Face ID…" : "Continue with Face ID"}
              onPress={onFaceId}
              disabled={busy || !meraAvailable}
            />
            <View style={styles.meraRow}>
              <Pressable
                onPress={() => onMera("create")}
                hitSlop={8}
                disabled={busy || !meraAvailable}
              >
                <Text style={styles.footerLink}>Create new passkey</Text>
              </Pressable>
              <Pressable
                onPress={() => onMera("signin")}
                hitSlop={8}
                disabled={busy || !meraAvailable}
              >
                <Text style={styles.footerLink}>Use existing passkey</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              No seed phrase · no extension · wallet = passkey on device
              {meraAvailable ? ` · ${MERA_RP_ID}` : ""}
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>secures by device unlock</Text>
            <View style={styles.orLine} />
          </View>

          <View style={styles.facts}>
            <FactRow icon="shield-checkmark-outline" text="Trade of record = your passkey EOA" />
            <FactRow icon="wallet-outline" text="Agora AUSD collateral on Monad testnet" />
            <FactRow icon="trending-up" text="Perpl perps + 60s UP/DOWN markets" />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerMuted}>Face ID / fingerprint unlocks your wallet</Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function FactRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.factRow}>
      <Icon name={icon} size={16} color={colors.brand} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: space.lg,
    justifyContent: "space-between",
  },
  hero: { paddingTop: 20, gap: 14 },
  tagline: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 16,
    lineHeight: 22,
    maxWidth: 280,
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
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
  orText: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  facts: { gap: 10, marginTop: 4 },
  factRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  factText: { color: colors.muted, fontFamily: type.body, fontSize: 13, flex: 1 },
  setupBox: {
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    backgroundColor: colors.dangerDim,
    gap: 8,
  },
  setupTitle: { color: colors.danger, fontFamily: type.bold, fontSize: 14 },
  error: { color: colors.danger, fontFamily: type.medium, fontSize: 13 },
  hint: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 4,
  },
  footerMuted: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  footerLink: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 15,
  },
});
