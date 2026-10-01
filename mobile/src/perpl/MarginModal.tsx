import React, { useState } from "react";
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
} from "react-native";
import { haptic } from "@/src/utils/clipboard";
import { colors, radius, space, type, monoStyle } from "@/src/theme";
import { useToast } from "@/src/components/Toast";
import { depositPerplMargin, withdrawPerplMargin } from "@/src/wallet/privyTrade";

interface MarginModalProps {
  visible: boolean;
  onClose: () => void;
  walletAddress: string;
  walletAUSD: string;
  perplMarginAUSD: string;
  getEthereumProvider: () => Promise<any>;
  onSuccess: () => void;
}

export function MarginModal({
  visible,
  onClose,
  walletAddress,
  walletAUSD,
  perplMarginAUSD,
  getEthereumProvider,
  onSuccess,
}: MarginModalProps) {
  const toast = useToast();
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amountStr, setAmountStr] = useState("100");
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepLabel, setStepLabel] = useState<string | null>(null);

  const parsedAmount = parseFloat(amountStr) || 0;
  const numWalletCash = parseFloat(walletAUSD.replace(/,/g, "")) || 0;
  const numPerplMargin = parseFloat(perplMarginAUSD.replace(/,/g, "")) || 0;

  const onQuickChip = (val: number | "MAX") => {
    if (val === "MAX") {
      const maxVal = tab === "deposit" ? numWalletCash : numPerplMargin;
      setAmountStr(Math.floor(maxVal).toString());
    } else {
      setAmountStr(val.toString());
    }
  };

  const handleAction = async () => {
    if (parsedAmount <= 0) {
      toast.error("Invalid Amount", "Please enter an amount greater than 0");
      return;
    }

    if (tab === "deposit" && parsedAmount > numWalletCash) {
      toast.error("Insufficient Cash", `You only have $${walletAUSD} AUSD in your wallet`);
      return;
    }

    if (tab === "withdraw" && parsedAmount > numPerplMargin) {
      toast.error("Insufficient Margin", `You only have $${perplMarginAUSD} AUSD margin in Perpl`);
      return;
    }

    setIsProcessing(true);
    await haptic("medium");

    try {
      const provider = await getEthereumProvider();

      if (tab === "deposit") {
        setStepLabel("Depositing Agora AUSD on Monad...");
        const res = await depositPerplMargin({
          provider,
          address: walletAddress,
          amountAUSD: parsedAmount,
        });

        await haptic("success");
        toast.show("Margin Deposited", {
          body: `+$${parsedAmount} Agora AUSD credited to Perpl Exchange`,
          tone: "success",
        });
      } else {
        setStepLabel("Withdrawing to wallet...");
        await withdrawPerplMargin({
          provider,
          address: walletAddress,
          amountAUSD: parsedAmount,
        });

        await haptic("success");
        toast.show("Margin Withdrawn", {
          body: `-$${parsedAmount} AUSD returned to your Monad wallet`,
          tone: "neutral",
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Action Failed", err?.message || String(err));
    } finally {
      setIsProcessing(false);
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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>PERPL COLLATERAL</Text>
              <Text style={styles.subtitle}>Agora AUSD · Monad Testnet (10143)</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeIconBtn} hitSlop={12}>
              <Text style={styles.closeIconText}>✕</Text>
            </Pressable>
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeTabs}>
            <Pressable
              onPress={() => setTab("deposit")}
              style={[styles.modeTab, tab === "deposit" && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabText, tab === "deposit" && styles.modeTabTextActive]}>
                + DEPOSIT
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("withdraw")}
              style={[styles.modeTab, tab === "withdraw" && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabText, tab === "withdraw" && styles.modeTabTextActive]}>
                - WITHDRAW
              </Text>
            </Pressable>
          </View>

          {/* Balances Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>WALLET CASH (EOA)</Text>
              <Text style={styles.balanceVal}>${walletAUSD} AUSD</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>PERPL MARGIN (EXCHANGE)</Text>
              <Text style={[styles.balanceVal, { color: colors.brand }]}>
                ${perplMarginAUSD} AUSD
              </Text>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              {tab === "deposit" ? "AMOUNT TO DEPOSIT" : "AMOUNT TO WITHDRAW"}
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.muted}
                editable={!isProcessing}
              />
              <Text style={styles.currencySuffix}>AUSD</Text>
            </View>

            {/* Quick Chips */}
            <View style={styles.chipsRow}>
              {[50, 100, 250, "MAX" as const].map((val) => (
                <Pressable
                  key={val}
                  onPress={() => onQuickChip(val)}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>{typeof val === "number" ? `$${val}` : val}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Explainer Note */}
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              {tab === "deposit"
                ? "Collateral is held directly in the Perpl onchain contract to back your perpetual positions. Min account deposit is 100 AUSD."
                : "Free collateral not locked in open positions can be withdrawn back to your Monad testnet wallet."}
            </Text>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleAction}
            disabled={isProcessing}
            style={[styles.submitBtn, isProcessing && styles.submitBtnDisabled]}
          >
            {isProcessing ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.bg} size="small" />
                <Text style={styles.submitBtnTextLoading}>
                  {stepLabel || "Processing on Monad..."}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitBtnText}>
                {tab === "deposit"
                  ? `DEPOSIT ${parsedAmount > 0 ? `$${parsedAmount} ` : ""}AUSD TO PERPL`
                  : `WITHDRAW ${parsedAmount > 0 ? `$${parsedAmount} ` : ""}AUSD`}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(214,255,63,0.18)",
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: Platform.OS === "ios" ? 40 : space.xl,
    gap: space.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 16,
    letterSpacing: 0.8,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
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
  modeTabs: {
    flexDirection: "row",
    backgroundColor: "#0C0E14",
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radius.pill,
  },
  modeTabActive: {
    backgroundColor: colors.brandDim,
    borderColor: "rgba(214,255,63,0.3)",
    borderWidth: 1,
  },
  modeTabText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  modeTabTextActive: {
    color: colors.brand,
  },
  balanceCard: {
    flexDirection: "row",
    backgroundColor: "#0C0E14",
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  balanceCol: {
    flex: 1,
    alignItems: "center",
  },
  balanceDivider: {
    width: 1,
    backgroundColor: colors.lineStrong,
    marginVertical: 4,
  },
  balanceLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceVal: {
    color: colors.ink,
    fontFamily: type.data || "monospace",
    fontSize: 13,
    fontWeight: "bold",
  },
  inputSection: {
    gap: space.xs,
  },
  inputLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0C0E14",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(214,255,63,0.3)",
    paddingHorizontal: space.md,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
  },
  currencyPrefix: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 18,
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 18,
    padding: 0,
  },
  currencySuffix: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 12,
  },
  chipsRow: {
    flexDirection: "row",
    gap: space.xs,
    marginTop: 6,
  },
  chip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  chipText: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 11,
  },
  noteBox: {
    backgroundColor: "rgba(214,255,63,0.04)",
    borderRadius: radius.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.brand,
    padding: space.sm,
  },
  noteText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.xs,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  submitBtnText: {
    color: "#0A0B0D",
    fontFamily: type.bold,
    fontSize: 13,
    letterSpacing: 0.6,
    fontWeight: "bold",
  },
  submitBtnTextLoading: {
    color: "#0A0B0D",
    fontFamily: type.bold,
    fontSize: 12,
    fontWeight: "bold",
  },
});
