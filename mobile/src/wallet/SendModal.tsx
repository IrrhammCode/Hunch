import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { haptic, pasteFromClipboard } from "@/src/utils/clipboard";
import { colors, radius, space, type, monoStyle } from "@/src/theme";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import { sendOnchainTransfer } from "./privyTrade";

interface SendModalProps {
  visible: boolean;
  onClose: () => void;
  walletAddress: string;
  walletAUSD: string;
  walletMON: string;
  getEthereumProvider: () => Promise<any>;
  onSuccess: () => void;
  initialToken?: "AUSD" | "MON";
}

export function SendModal({
  visible,
  onClose,
  walletAddress,
  walletAUSD,
  walletMON,
  getEthereumProvider,
  onSuccess,
  initialToken = "AUSD",
}: SendModalProps) {
  const toast = useToast();
  const [token, setToken] = useState<"AUSD" | "MON">(initialToken);
  const [recipient, setRecipient] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [stepLabel, setStepLabel] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setToken(initialToken);
      setRecipient("");
      setAmountStr("");
      setIsSending(false);
      setStepLabel(null);
    }
  }, [visible, initialToken]);

  const numAUSD = parseFloat(walletAUSD.replace(/,/g, "")) || 0;
  const numMON = parseFloat(walletMON.replace(/,/g, "")) || 0;
  const availableBal = token === "AUSD" ? numAUSD : numMON;
  const parsedAmount = parseFloat(amountStr) || 0;

  // Validation
  const cleanRecipient = recipient.trim();
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(cleanRecipient);
  const isSelf =
    isValidAddress &&
    walletAddress &&
    cleanRecipient.toLowerCase() === walletAddress.toLowerCase();

  const isInsufficient = parsedAmount > availableBal;
  const isExceedsMonGas =
    token === "MON" && parsedAmount > Math.max(0, availableBal - 0.002);
  const canSend =
    isValidAddress &&
    parsedAmount > 0 &&
    !isInsufficient &&
    (!isExceedsMonGas || availableBal <= 0.002) &&
    !isSending;

  const onPasteRecipient = async () => {
    const text = await pasteFromClipboard();
    if (text) {
      setRecipient(text.trim());
      await haptic("selection");
    } else {
      toast.show("Clipboard Empty", {
        body: "No text found in clipboard",
        tone: "neutral",
      });
    }
  };

  const onQuickChip = (pct: number) => {
    if (availableBal <= 0) return;
    let target = 0;
    if (pct === 100) {
      if (token === "MON") {
        // Reserve 0.005 MON for gas
        target = Math.max(0, Math.floor((availableBal - 0.005) * 10000) / 10000);
      } else {
        target = Math.floor(availableBal * 100) / 100;
      }
    } else {
      target = Math.floor(availableBal * (pct / 100) * 100) / 100;
    }
    setAmountStr(target > 0 ? target.toString() : "0");
    haptic("selection");
  };

  const handleSend = async () => {
    if (!isValidAddress) {
      toast.error("Invalid Address", "Please enter a valid 42-character Monad EVM address.");
      return;
    }
    if (parsedAmount <= 0) {
      toast.error("Invalid Amount", "Please enter an amount greater than 0.");
      return;
    }
    if (isInsufficient) {
      toast.error("Insufficient Balance", `You only have ${availableBal} ${token} available.`);
      return;
    }

    setIsSending(true);
    await haptic("medium");
    setStepLabel(`Signing ${token} transfer on Monad...`);

    try {
      const provider = await getEthereumProvider();
      setStepLabel(`Broadcasting to Monad Testnet...`);

      const result = await sendOnchainTransfer({
        provider,
        from: walletAddress,
        to: cleanRecipient,
        amount: amountStr.trim(),
        token,
      });

      await haptic("success");
      toast.show("Transfer Confirmed", {
        body: `Sent ${amountStr} ${token} to ${cleanRecipient.slice(0, 6)}…${cleanRecipient.slice(-4)}`,
        tone: "success",
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      await haptic("error");
      toast.error("Transfer Failed", err?.message || String(err));
    } finally {
      setIsSending(false);
      setStepLabel(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
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
                <Text style={styles.title}>SEND ASSETS</Text>
                <Text style={styles.subtitle}>Instant Transfer · Monad Testnet</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeIconBtn} hitSlop={12}>
                <Text style={styles.closeIconText}>✕</Text>
              </Pressable>
            </View>

            {/* Token Switcher */}
            <View style={styles.tokenTabs}>
              <Pressable
                onPress={() => {
                  setToken("AUSD");
                  haptic("selection");
                }}
                style={[styles.tokenTab, token === "AUSD" && styles.tokenTabActive]}
              >
                <View style={[styles.tabGlyph, { backgroundColor: "#0E2B1F" }]}>
                  <Text style={[styles.tabGlyphText, { color: colors.up }]}>A</Text>
                </View>
                <View>
                  <Text style={[styles.tokenTabName, token === "AUSD" && styles.tokenTabNameActive]}>
                    Agora AUSD
                  </Text>
                  <Text style={styles.tokenTabBal}>Bal: ${walletAUSD}</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  setToken("MON");
                  haptic("selection");
                }}
                style={[styles.tokenTab, token === "MON" && styles.tokenTabActive]}
              >
                <View style={[styles.tabGlyph, { backgroundColor: "rgba(131,110,249,0.2)" }]}>
                  <Text style={[styles.tabGlyphText, { color: colors.monadPurple }]}>M</Text>
                </View>
                <View>
                  <Text style={[styles.tokenTabName, token === "MON" && styles.tokenTabNameActive]}>
                    Monad Gas
                  </Text>
                  <Text style={styles.tokenTabBal}>{walletMON} MON</Text>
                </View>
              </Pressable>
            </View>

            {/* Recipient Address Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>RECIPIENT ADDRESS</Text>
                {isValidAddress ? (
                  <View style={styles.validBadge}>
                    <Icon name="checkmark-circle" size={12} color={colors.up} />
                    <Text style={styles.validBadgeText}>
                      {isSelf ? "Self-transfer" : "Valid Address"}
                    </Text>
                  </View>
                ) : cleanRecipient.length > 0 ? (
                  <Text style={styles.invalidBadgeText}>Invalid 0x address</Text>
                ) : null}
              </View>

              <View style={styles.recipientInputWrap}>
                <TextInput
                  style={styles.recipientInput}
                  value={recipient}
                  onChangeText={setRecipient}
                  placeholder="0x..."
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSending}
                />
                <Pressable
                  onPress={onPasteRecipient}
                  style={styles.pasteBtn}
                  disabled={isSending}
                >
                  <Icon name="copy-outline" size={14} color={colors.brand} />
                  <Text style={styles.pasteBtnText}>PASTE</Text>
                </Pressable>
              </View>
            </View>

            {/* Amount Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>AMOUNT</Text>
                <Text style={styles.availableText}>
                  Avail: <Text style={styles.boldWhite}>{availableBal.toFixed(token === "AUSD" ? 2 : 4)} {token}</Text>
                </Text>
              </View>

              <View style={styles.amountInputWrap}>
                <Text style={styles.currencyPrefix}>
                  {token === "AUSD" ? "$" : "M"}
                </Text>
                <TextInput
                  style={styles.amountInput}
                  value={amountStr}
                  onChangeText={setAmountStr}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colors.muted}
                  editable={!isSending}
                />
                <Text style={styles.currencySuffix}>{token}</Text>
              </View>

              {/* Quick Chips */}
              <View style={styles.chipsRow}>
                {[25, 50, 75, 100].map((pct) => (
                  <Pressable
                    key={pct}
                    onPress={() => onQuickChip(pct)}
                    disabled={isSending}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>
                      {pct === 100 ? "MAX" : `${pct}%`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Estimated Breakdown */}
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Network</Text>
                <Text style={styles.breakdownVal}>Monad Testnet (10143)</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Estimated Gas</Text>
                <Text style={styles.breakdownVal}>&lt; 0.0008 MON (&lt;$0.01)</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Finality Speed</Text>
                <Text style={[styles.breakdownVal, { color: colors.brand }]}>
                  ~400 ms (Single-slot)
                </Text>
              </View>
            </View>

            {/* Send Button */}
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            >
              {isSending ? (
                <View style={styles.sendingRow}>
                  <ActivityIndicator color="#0A0B0D" size="small" />
                  <Text style={styles.sendBtnText}>
                    {stepLabel || "PROCESSING..."}
                  </Text>
                </View>
              ) : (
                <Text style={styles.sendBtnText}>
                  {parsedAmount <= 0
                    ? "ENTER AMOUNT"
                    : isInsufficient
                    ? "INSUFFICIENT BALANCE"
                    : !isValidAddress
                    ? "ENTER VALID RECIPIENT"
                    : `SEND ${parsedAmount} ${token}`}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  tokenTabs: {
    flexDirection: "row",
    gap: 10,
  },
  tokenTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161C28",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "#222B3D",
    gap: 10,
  },
  tokenTabActive: {
    borderColor: colors.brand,
    backgroundColor: "#1B2436",
  },
  tabGlyph: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabGlyphText: {
    fontFamily: type.data,
    fontSize: 14,
    fontWeight: "800",
  },
  tokenTabName: {
    fontFamily: type.bold,
    fontSize: 13,
    color: colors.muted,
  },
  tokenTabNameActive: {
    color: colors.ink,
  },
  tokenTabBal: {
    fontFamily: type.data,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  section: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  validBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  validBadgeText: {
    fontFamily: type.data,
    fontSize: 10,
    color: colors.up,
    fontWeight: "600",
  },
  invalidBadgeText: {
    fontFamily: type.data,
    fontSize: 10,
    color: colors.down,
  },
  availableText: {
    fontFamily: type.data,
    fontSize: 10,
    color: colors.muted,
  },
  boldWhite: {
    color: colors.ink,
    fontWeight: "700",
  },
  recipientInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161C28",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#222B3D",
    paddingHorizontal: 12,
  },
  recipientInput: {
    flex: 1,
    fontFamily: type.data,
    fontSize: 12,
    color: colors.ink,
    paddingVertical: 12,
  },
  pasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(214, 255, 63, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  pasteBtnText: {
    fontFamily: type.data,
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161C28",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#222B3D",
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontFamily: type.data,
    fontSize: 20,
    color: colors.muted,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: type.bold,
    fontSize: 24,
    color: colors.ink,
    paddingVertical: 10,
  },
  currencySuffix: {
    fontFamily: type.data,
    fontSize: 13,
    color: colors.muted,
    fontWeight: "700",
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    backgroundColor: "#1B2232",
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#2A364E",
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  breakdownCard: {
    backgroundColor: "#0D111A",
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E2638",
    gap: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    fontFamily: type.body,
    fontSize: 11,
    color: colors.muted,
  },
  breakdownVal: {
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "600",
    color: colors.ink,
  },
  sendBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sendBtnDisabled: {
    backgroundColor: "#202838",
    opacity: 0.6,
  },
  sendBtnText: {
    fontFamily: type.bold,
    fontSize: 15,
    fontWeight: "800",
    color: "#0A0B0D",
    letterSpacing: 0.5,
  },
  sendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
