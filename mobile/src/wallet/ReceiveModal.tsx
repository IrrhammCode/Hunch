import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Share,
  Linking,
  Platform,
  ScrollView,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { toQR } from "toqr";
import { haptic, copyToClipboard } from "@/src/utils/clipboard";
import { colors, radius, space, type, monoStyle } from "@/src/theme";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import { explorerAddress } from "@/src/config/chain";
import { generatePaymentUri } from "./userDirectory";

interface ReceiveModalProps {
  visible: boolean;
  onClose: () => void;
  walletAddress: string;
  userHandle?: string;
}

export function ReceiveModal({
  visible,
  onClose,
  walletAddress,
  userHandle = "trader",
}: ReceiveModalProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [requestedAmount, setRequestedAmount] = useState("");
  const [requestedToken, setRequestedToken] = useState<"AUSD" | "MON">("AUSD");

  // Format QR payload (either raw address or rich payment URI)
  const qrPayload = useMemo(() => {
    if (!walletAddress) return "";
    const parsedAmt = parseFloat(requestedAmount);
    if (showAmountInput && !isNaN(parsedAmt) && parsedAmt > 0) {
      return generatePaymentUri({
        address: walletAddress,
        amount: requestedAmount.trim(),
        token: requestedToken,
        handle: userHandle.startsWith("@") ? userHandle : `@${userHandle}`,
      });
    }
    return walletAddress;
  }, [walletAddress, showAmountInput, requestedAmount, requestedToken, userHandle]);

  // Generate crisp QR SVG Path
  const { path: qrPath, size: qrSize } = useMemo(() => {
    if (!qrPayload) return { path: "", size: 0 };
    try {
      const matrix = toQR(qrPayload);
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
  }, [qrPayload]);

  const onCopy = async () => {
    if (!walletAddress) return;
    const textToCopy = showAmountInput && parseFloat(requestedAmount) > 0 ? qrPayload : walletAddress;
    await copyToClipboard(textToCopy);
    await haptic("success");
    setCopied(true);
    toast.show("Copied", {
      body: showAmountInput && parseFloat(requestedAmount) > 0
        ? "Payment request link copied"
        : "Wallet address copied to clipboard",
      tone: "success",
    });
    setTimeout(() => setCopied(false), 2200);
  };

  const onShare = async () => {
    if (!walletAddress) return;
    await haptic("light");
    const shareText =
      showAmountInput && parseFloat(requestedAmount) > 0
        ? `Pay ${userHandle} ${requestedAmount} ${requestedToken} on Monad: ${qrPayload}`
        : `My Monad Testnet Address: ${walletAddress}`;
    try {
      await Share.share({
        message: shareText,
        title: "Monad Testnet Payment",
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
  const normalizedHandle = userHandle.startsWith("@") ? userHandle : `@${userHandle}`;

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
            showsVerticalScrollIndicator={false}
          >
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

            {/* Handle & Network Badge Row */}
            <View style={styles.badgesRow}>
              <View style={styles.handleBadge}>
                <View style={styles.handleDot} />
                <Text style={styles.handleBadgeText}>{normalizedHandle}</Text>
              </View>
              <View style={styles.networkBadge}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.networkBadgeText}>MONAD TESTNET (10143)</Text>
              </View>
            </View>

            {/* QR Code Container */}
            <View style={styles.qrContainer}>
              <View style={styles.qrCard}>
                {qrSize > 0 ? (
                  <Svg
                    width={200}
                    height={200}
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

              {/* Scan description */}
              {showAmountInput && parseFloat(requestedAmount) > 0 ? (
                <View style={styles.requestPreviewPill}>
                  <Text style={styles.requestPreviewText}>
                    Requesting: <Text style={styles.boldLime}>{requestedAmount} {requestedToken}</Text>
                  </Text>
                </View>
              ) : (
                <Text style={styles.scanHint}>Scan with any Monad scanner or Hunch app</Text>
              )}
            </View>

            {/* Request Specific Amount Toggle / Input */}
            <View style={styles.requestSection}>
              {!showAmountInput ? (
                <Pressable
                  onPress={() => {
                    setShowAmountInput(true);
                    haptic("selection");
                  }}
                  style={styles.requestToggleBtn}
                >
                  <Icon name="add-circle-outline" size={15} color={colors.brand} />
                  <Text style={styles.requestToggleText}>+ REQUEST SPECIFIC AMOUNT</Text>
                </Pressable>
              ) : (
                <View style={styles.amountInputCard}>
                  <View style={styles.amountInputHeader}>
                    <Text style={styles.amountInputLabel}>REQUEST AMOUNT</Text>
                    <Pressable
                      onPress={() => {
                        setShowAmountInput(false);
                        setRequestedAmount("");
                        haptic("selection");
                      }}
                    >
                      <Text style={styles.clearText}>Clear</Text>
                    </Pressable>
                  </View>

                  <View style={styles.amountInputRow}>
                    <View style={styles.tokenMiniSwitcher}>
                      <Pressable
                        onPress={() => setRequestedToken("AUSD")}
                        style={[
                          styles.tokenMiniBtn,
                          requestedToken === "AUSD" && styles.tokenMiniBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tokenMiniText,
                            requestedToken === "AUSD" && styles.tokenMiniTextActive,
                          ]}
                        >
                          AUSD
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setRequestedToken("MON")}
                        style={[
                          styles.tokenMiniBtn,
                          requestedToken === "MON" && styles.tokenMiniBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tokenMiniText,
                            requestedToken === "MON" && styles.tokenMiniTextActive,
                          ]}
                        >
                          MON
                        </Text>
                      </Pressable>
                    </View>

                    <TextInput
                      style={styles.amountTextInput}
                      value={requestedAmount}
                      onChangeText={setRequestedAmount}
                      placeholder="e.g. 50"
                      placeholderTextColor={colors.muted}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Address Display Box */}
            <View style={styles.addressSection}>
              <Text style={styles.addressLabel}>YOUR MONAD EOA ADDRESS</Text>
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

            {/* Done Button */}
            <Pressable
              style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
              onPress={onClose}
            >
              <Text style={styles.doneBtnText}>DONE</Text>
            </Pressable>
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
    maxHeight: "92%",
  },
  scrollContent: {
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1D2536",
    borderWidth: 1.5,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  handleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(214, 255, 63, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(214, 255, 63, 0.3)",
    gap: 5,
  },
  handleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  handleBadgeText: {
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "800",
    color: colors.brand,
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
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
    paddingVertical: 4,
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
    width: 200,
    height: 200,
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
  requestPreviewPill: {
    backgroundColor: "rgba(214, 255, 63, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(214, 255, 63, 0.25)",
    marginTop: 10,
  },
  requestPreviewText: {
    fontFamily: type.data,
    fontSize: 11,
    color: colors.ink,
  },
  boldLime: {
    color: colors.brand,
    fontWeight: "800",
  },
  requestSection: {
    marginTop: 2,
  },
  requestToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#131A14",
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(214, 255, 63, 0.28)",
    borderStyle: "dashed",
    gap: 6,
  },
  requestToggleText: {
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 0.3,
  },
  amountInputCard: {
    backgroundColor: "#131A14",
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(214, 255, 63, 0.22)",
    gap: 8,
  },
  amountInputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountInputLabel: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  clearText: {
    fontFamily: type.data,
    fontSize: 11,
    color: colors.down,
  },
  amountInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  tokenMiniSwitcher: {
    flexDirection: "row",
    backgroundColor: "#0D111A",
    borderRadius: 8,
    padding: 2,
  },
  tokenMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tokenMiniBtnActive: {
    backgroundColor: colors.brand,
  },
  tokenMiniText: {
    fontFamily: type.data,
    fontSize: 10,
    color: colors.muted,
    fontWeight: "700",
  },
  tokenMiniTextActive: {
    color: "#0A0B0D",
    fontWeight: "800",
  },
  amountTextInput: {
    flex: 1,
    backgroundColor: "#0D111A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontFamily: type.data,
    fontSize: 13,
    color: colors.ink,
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
    backgroundColor: "#131A14",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(214, 255, 63, 0.22)",
    gap: 8,
  },
  addressBoxPressed: {
    borderColor: colors.brand,
    backgroundColor: "rgba(214, 255, 63, 0.12)",
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
    backgroundColor: "#1D261E",
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
    backgroundColor: "#131A14",
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(214, 255, 63, 0.22)",
    gap: 6,
  },
  actionBtnPressed: {
    backgroundColor: "rgba(214, 255, 63, 0.14)",
    borderColor: colors.brand,
  },
  actionBtnText: {
    fontFamily: type.body,
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
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
