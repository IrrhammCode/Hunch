import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Easing,
  ScrollView,
} from "react-native";
import { haptic, pasteFromClipboard } from "@/src/utils/clipboard";
import { colors, radius, space, type } from "@/src/theme";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import {
  parseQrPayload,
  VERIFIED_DIRECTORY,
  type ParsedPaymentQr,
} from "./userDirectory";

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (payload: ParsedPaymentQr) => void;
}

export function QrScannerModal({
  visible,
  onClose,
  onScan,
}: QrScannerModalProps) {
  const toast = useToast();
  const [manualInput, setManualInput] = useState("");
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Animate laser scanner up and down
  useEffect(() => {
    if (visible) {
      setManualInput("");
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [visible, scanAnim]);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 190],
  });

  const handleApplyPayload = async (raw: string) => {
    const parsed = parseQrPayload(raw);
    if (!parsed) {
      await haptic("error");
      toast.error(
        "Invalid QR Payload",
        "Could not detect a valid Monad EVM address or @username in the QR code.",
      );
      return;
    }

    await haptic("success");
    toast.show("QR Code Scanned", {
      body: parsed.handle
        ? `Recipient resolved: ${parsed.handle}`
        : `Address: ${parsed.address.slice(0, 6)}…${parsed.address.slice(-4)}`,
      tone: "success",
    });

    onScan(parsed);
    onClose();
  };

  const onPasteManual = async () => {
    const text = await pasteFromClipboard();
    if (text) {
      setManualInput(text.trim());
      await haptic("selection");
    } else {
      toast.show("Clipboard Empty", {
        body: "No text found in clipboard",
        tone: "neutral",
      });
    }
  };

  // Preset demo targets
  const DEMO_PRESETS = [
    {
      label: "@alice ($25 AUSD)",
      raw: `hunch:pay?address=${VERIFIED_DIRECTORY[0].address}&amount=25&token=AUSD&handle=@alice`,
      color: "#2EE59D",
    },
    {
      label: "@monad_whale (5 MON)",
      raw: `hunch:pay?address=${VERIFIED_DIRECTORY[2].address}&amount=5&token=MON&handle=@monad_whale`,
      color: "#D6FF3F",
    },
    {
      label: "@bob ($100 AUSD)",
      raw: `hunch:pay?address=${VERIFIED_DIRECTORY[1].address}&amount=100&token=AUSD&handle=@bob`,
      color: "#836EF9",
    },
    {
      label: "@keone ($50 AUSD)",
      raw: `hunch:pay?address=${VERIFIED_DIRECTORY[3].address}&amount=50&token=AUSD&handle=@keone`,
      color: "#00E5FF",
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>SCAN QR CODE</Text>
                <Text style={styles.subtitle}>
                  Align payment QR or pick registered trader
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeIconBtn} hitSlop={12}>
                <Text style={styles.closeIconText}>✕</Text>
              </Pressable>
            </View>

            {/* Live Laser Viewfinder */}
            <View style={styles.viewfinderContainer}>
              <View style={styles.reticle}>
                {/* Corner Accents */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Sweeping Laser Line */}
                <Animated.View
                  style={[
                    styles.laserLine,
                    {
                      transform: [{ translateY }],
                    },
                  ]}
                />

                {/* Central Scan Hint */}
                <View style={styles.centerIconWrap}>
                  <Icon name="qr-code-outline" size={44} color="rgba(214, 255, 63, 0.4)" />
                  <Text style={styles.viewfinderHint}>VIEWFINDER ACTIVE</Text>
                </View>
              </View>
              <Text style={styles.reticleSubtitle}>
                Supports Hunch Pay, EIP-681, and Monad addresses
              </Text>
            </View>

            {/* Quick Demo Simulator Cards */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TAP TO SIMULATE INSTANT SCAN</Text>
              <View style={styles.presetsGrid}>
                {DEMO_PRESETS.map((p) => (
                  <Pressable
                    key={p.label}
                    onPress={() => handleApplyPayload(p.raw)}
                    style={({ pressed }) => [
                      styles.presetChip,
                      pressed && styles.presetChipPressed,
                    ]}
                  >
                    <View style={[styles.presetDot, { backgroundColor: p.color }]} />
                    <Text style={styles.presetText}>{p.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Manual QR / URI Input */}
            <View style={styles.section}>
              <View style={styles.manualHeaderRow}>
                <Text style={styles.sectionLabel}>OR PASTE QR PAYLOAD / URI</Text>
                <Pressable onPress={onPasteManual} style={styles.pasteMiniBtn}>
                  <Icon name="copy-outline" size={12} color={colors.brand} />
                  <Text style={styles.pasteMiniText}>PASTE CLIPBOARD</Text>
                </Pressable>
              </View>

              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={manualInput}
                  onChangeText={setManualInput}
                  placeholder="hunch:pay?address=0x... or 0x..."
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Pressable
                onPress={() => handleApplyPayload(manualInput)}
                disabled={!manualInput.trim()}
                style={[
                  styles.applyBtn,
                  !manualInput.trim() && styles.applyBtnDisabled,
                ]}
              >
                <Text style={styles.applyBtnText}>DECODE & APPLY QR</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  sheet: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#11141C",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#222B3D",
    maxHeight: "90%",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontFamily: type.bold,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1B2232",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  viewfinderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  reticle: {
    width: 220,
    height: 220,
    backgroundColor: "rgba(10, 15, 24, 0.7)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: colors.brand,
  },
  cornerTL: {
    top: 8,
    left: 8,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 8,
    right: 8,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  laserLine: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  centerIconWrap: {
    alignItems: "center",
    gap: 8,
  },
  viewfinderHint: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 1,
  },
  reticleSubtitle: {
    fontFamily: type.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 8,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161D2B",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#222D42",
    gap: 6,
  },
  presetChipPressed: {
    backgroundColor: "#202A3E",
    borderColor: colors.brand,
  },
  presetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  presetText: {
    fontFamily: type.data,
    fontSize: 11,
    color: colors.ink,
    fontWeight: "600",
  },
  presetScanIcon: {
    fontSize: 11,
    color: colors.brand,
  },
  manualHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pasteMiniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pasteMiniText: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
  },
  inputWrap: {
    backgroundColor: "#161C28",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#222B3D",
    paddingHorizontal: 12,
  },
  input: {
    fontFamily: type.data,
    fontSize: 12,
    color: colors.ink,
    paddingVertical: 10,
  },
  applyBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnDisabled: {
    backgroundColor: "#202838",
    opacity: 0.5,
  },
  applyBtnText: {
    fontFamily: type.bold,
    fontSize: 13,
    fontWeight: "800",
    color: "#0A0B0D",
    letterSpacing: 0.5,
  },
});
