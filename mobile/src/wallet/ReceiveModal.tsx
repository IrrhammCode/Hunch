import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Share,
  Linking,
  Platform,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { toQR } from "toqr";
import { haptic, copyToClipboard } from "@/src/utils/clipboard";
import { colors, radius, space, type, monoStyle } from "@/src/theme";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import { explorerAddress } from "@/src/config/chain";
import { AUSD_TOKEN_ADDRESS } from "./privyTrade";

interface ReceiveModalProps {
  visible: boolean;
  onClose: () => void;
  walletAddress: string;
}

export function ReceiveModal({
  visible,
  onClose,
  walletAddress,
}: ReceiveModalProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // Generate crisp QR SVG Path
  const { path: qrPath, size: qrSize } = useMemo(() => {
    if (!walletAddress) return { path: "", size: 0 };
    try {
      const matrix = toQR(walletAddress);
      const size = Math.round(Math.sqrt(matrix.length));
      let p = "";
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (matrix[y * size + x]) {
            p += `M${x},${y}h1v1h-1z `;
          }
        }
      }
      return { path: p, size };
    } catch {
      return { path: "", size: 0 };
    }
  }, [walletAddress]);

  const onCopy = async () => {
    if (!walletAddress) return;
    await copyToClipboard(walletAddress);
    await haptic("success");
    setCopied(true);
    toast.show("Address Copied", {
      body: "Wallet address copied to clipboard",
      tone: "success",
    });
    setTimeout(() => setCopied(false), 2200);
  };

  const onShare = async () => {
    if (!walletAddress) return;
    await haptic("light");
    try {
      await Share.share({
        message: walletAddress,
        title: "My Monad Testnet Wallet Address",
      });
    } catch {
      /* ignore */
    }
  };

  const onOpenExplorer = async () => {
    if (!walletAddress) return;
    await haptic("light");
    const url = explorerAddress(walletAddress, "monad");
    Linking.openURL(url).catch(() => {});
  };

  const pad = 2;

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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>RECEIVE ASSETS</Text>
              <Text style={styles.subtitle}>Monad Testnet · Chain ID 10143</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeIconBtn} hitSlop={12}>
              <Text style={styles.closeIconText}>✕</Text>
            </Pressable>
          </View>

          {/* Network Badge */}
          <View style={styles.networkBadge}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.networkBadgeText}>MONAD TESTNET (EOA PASSKEY)</Text>
          </View>

          {/* QR Code Container */}
          <View style={styles.qrContainer}>
            <View style={styles.qrCard}>
              {qrSize > 0 ? (
                <Svg
                  width={210}
                  height={210}
                  viewBox={`-${pad} -${pad} ${qrSize + pad * 2} ${qrSize + pad * 2}`}
                >
                  <Path d={qrPath} fill="#0A0B0D" />
                </Svg>
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Icon name="qr-code-outline" size={48} color={colors.muted} />
                  <Text style={styles.qrLoadingText}>No address loaded</Text>
                </View>
              )}
            </View>
            <Text style={styles.scanHint}>Scan to transfer AUSD or MON</Text>
          </View>

          {/* Address Display Box */}
          <View style={styles.addressSection}>
            <Text style={styles.addressLabel}>YOUR WALLET ADDRESS</Text>
            <Pressable
              onPress={onCopy}
              style={({ pressed }) => [styles.addressBox, pressed && styles.addressBoxPressed]}
            >
              <Text style={styles.addressText} numberOfLines={2} selectable>
                {walletAddress || "0x..."}
              </Text>
              <View style={styles.copyInlineBadge}>
                <Icon
                  name={copied ? "checkmark-circle" : "copy-outline"}
                  size={14}
                  color={copied ? colors.brand : colors.muted}
                />
                <Text style={[styles.copyInlineText, copied && { color: colors.brand }]}>
                  {copied ? "COPIED" : "COPY"}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={onShare}
            >
              <Icon name="share-outline" size={16} color={colors.ink} />
              <Text style={styles.actionBtnText}>Share</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={onOpenExplorer}
            >
              <Icon name="open-outline" size={16} color={colors.ink} />
              <Text style={styles.actionBtnText}>Explorer</Text>
            </Pressable>
          </View>

          {/* Supported Tokens Info */}
          <View style={styles.supportedCard}>
            <Text style={styles.supportedTitle}>SUPPORTED COLLATERAL & TOKENS</Text>
            <View style={styles.tokenPillRow}>
              <View style={styles.tokenPill}>
                <View style={[styles.tokenGlyph, { backgroundColor: "#0E2B1F" }]}>
                  <Text style={[styles.tokenGlyphText, { color: colors.up }]}>A</Text>
                </View>
                <View>
                  <Text style={styles.tokenPillName}>Agora AUSD</Text>
                  <Text style={styles.tokenPillSub}>ERC-20 · 6 Decimals</Text>
                </View>
              </View>

              <View style={styles.tokenPill}>
                <View style={[styles.tokenGlyph, { backgroundColor: "rgba(131,110,249,0.2)" }]}>
                  <Text style={[styles.tokenGlyphText, { color: colors.monadPurple }]}>M</Text>
                </View>
                <View>
                  <Text style={styles.tokenPillName}>Native MON</Text>
                  <Text style={styles.tokenPillSub}>Monad Gas · 18 Decimals</Text>
                </View>
              </View>
            </View>
            <Text style={styles.noticeText}>
              • Only send Monad Testnet assets to this address. Other networks are not supported.
            </Text>
          </View>

          {/* Done Button */}
          <Pressable
            style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
            onPress={onClose}
          >
            <Text style={styles.doneBtnText}>DONE</Text>
          </Pressable>
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
    backgroundColor: "rgba(0, 0, 0, 0.78)",
  },
  sheet: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#11141C",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#222B3D",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    gap: 14,
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
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 230, 153, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 230, 153, 0.25)",
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.up,
  },
  networkBadgeText: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "700",
    color: colors.up,
    letterSpacing: 0.5,
  },
  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  qrCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  qrPlaceholder: {
    width: 210,
    height: 210,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161C28",
    borderRadius: 12,
  },
  qrLoadingText: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 8,
  },
  scanHint: {
    fontFamily: type.data,
    fontSize: 11,
    color: colors.muted,
    marginTop: 10,
    letterSpacing: 0.3,
  },
  addressSection: {
    gap: 6,
  },
  addressLabel: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  addressBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161C28",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#222B3D",
    gap: 8,
  },
  addressBoxPressed: {
    borderColor: colors.brand,
    backgroundColor: "#1A2234",
  },
  addressText: {
    flex: 1,
    fontFamily: type.data,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 18,
  },
  copyInlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#202838",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyInlineText: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#192131",
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#2B374E",
    gap: 6,
  },
  actionBtnPressed: {
    backgroundColor: "#222C42",
  },
  actionBtnText: {
    fontFamily: type.body,
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  supportedCard: {
    backgroundColor: "#0D111A",
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E2638",
    gap: 8,
  },
  supportedTitle: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  tokenPillRow: {
    flexDirection: "row",
    gap: 10,
  },
  tokenPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141A26",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#20283A",
    gap: 8,
  },
  tokenGlyph: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenGlyphText: {
    fontFamily: type.data,
    fontSize: 12,
    fontWeight: "800",
  },
  tokenPillName: {
    fontFamily: type.bold,
    fontSize: 12,
    color: colors.ink,
  },
  tokenPillSub: {
    fontFamily: type.data,
    fontSize: 9,
    color: colors.muted,
  },
  noticeText: {
    fontFamily: type.body,
    fontSize: 10.5,
    color: colors.muted,
    lineHeight: 14,
  },
  doneBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnPressed: {
    opacity: 0.88,
  },
  doneBtnText: {
    fontFamily: type.bold,
    fontSize: 15,
    fontWeight: "800",
    color: "#0A0B0D",
    letterSpacing: 0.5,
  },
});
