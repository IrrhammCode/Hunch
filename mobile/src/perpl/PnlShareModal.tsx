import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { colors, radius, space, type } from "@/src/theme";
import { copyToClipboard, haptic } from "@/src/utils/clipboard";
import { useToast } from "@/src/components/Toast";
import type { PerplPosition } from "@/src/api/client";

interface PnlShareModalProps {
  visible: boolean;
  onClose: () => void;
  position: PerplPosition | null;
}

export function PnlShareModal({ visible, onClose, position }: PnlShareModalProps) {
  const toast = useToast();
  if (!position) return null;

  const isClosed = position.status === "CLOSED";
  const pnlAUSD = isClosed ? (position.realizedPnLAUSD ?? 0) : (position.unrealizedPnLAUSD ?? 0);
  const pnlPct = position.marginAUSD > 0
    ? (pnlAUSD / position.marginAUSD) * 100
    : (position.unrealizedPnLPct ?? 0);

  const isProfitable = pnlAUSD >= 0;
  const pnlColor = isProfitable ? colors.up : colors.down;
  const currentPrice = isClosed
    ? (position.closedPrice ?? position.entryPrice)
    : (position.markPrice ?? position.entryPrice);

  const handleCopy = async () => {
    await haptic("medium");
    const sign = isProfitable ? "+" : "";
    const text = [
      `Hunch DEX Terminal · Monad Testnet`,
      `${position.symbol} ${position.side} ${position.leverage}X`,
      `PnL: ${sign}${pnlPct.toFixed(1)}% (${sign}$${pnlAUSD.toFixed(2)} AUSD)`,
      `Entry: $${position.entryPrice.toLocaleString()} → Mark: $${currentPrice.toLocaleString()}`,
      `Collateral: Agora AUSD · Verified on Perpl Protocol`,
      `Trade on: https://hunch.trade`,
    ].join("\n");

    const success = await copyToClipboard(text);
    if (success) {
      await haptic("success");
      toast.show("PnL Copied", {
        body: "Formatted for Twitter/Telegram sharing!",
        tone: "success",
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.contentWrap}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* VIRAL SHARE CARD */}
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.brandRow}>
                  <View style={styles.logoMark}>
                    <Text style={styles.logoGlyph}>▲</Text>
                  </View>
                  <View>
                    <Text style={styles.brandTitle}>HUNCH</Text>
                    <Text style={styles.brandSub}>DEX TERMINAL</Text>
                  </View>
                </View>

                <View style={styles.headerRight}>
                  <View style={styles.networkBadge}>
                    <View style={styles.greenDot} />
                    <Text style={styles.networkText}>MONAD TESTNET</Text>
                  </View>

                  <Pressable
                    onPress={onClose}
                    hitSlop={16}
                    style={styles.topCloseBtn}
                  >
                    <Text style={styles.topCloseText}>✕</Text>
                  </Pressable>
                </View>
              </View>

              {/* Asset Strip */}
              <View style={styles.assetStrip}>
                <View style={styles.assetLeft}>
                  <View
                    style={[
                      styles.sidePill,
                      {
                        backgroundColor:
                          position.side === "LONG"
                            ? "#0E291C"
                            : "#321118",
                        borderColor:
                          position.side === "LONG"
                            ? "#2EE59D"
                            : "#FF4D6A",
                      },
                    ]}
                  >
                    <Text style={[styles.sideText, { color: pnlColor }]}>
                      {position.side} {position.leverage}X
                    </Text>
                  </View>
                  <Text style={styles.symbolText}>{position.symbol} / AUSD PERP</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusTag}>{isClosed ? "CLOSED" : "LIVE POSITION"}</Text>
                </View>
              </View>

              {/* Big Hero PnL */}
              <View style={styles.pnlSection}>
                <Text style={styles.pnlLabel}>RETURN ON MARGIN</Text>
                <Text style={[styles.pnlPctNumber, { color: pnlColor }]}>
                  {isProfitable ? "+" : ""}
                  {pnlPct.toFixed(1)}%
                </Text>
                <View style={styles.usdBadge}>
                  <Text style={[styles.pnlUsdNumber, { color: pnlColor }]}>
                    {isProfitable ? "+" : ""}${pnlAUSD.toFixed(2)} AUSD
                  </Text>
                </View>
              </View>

              {/* Price & Execution Stats */}
              <View style={styles.statsCard}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>ENTRY PRICE</Text>
                  <Text style={styles.statVal}>${position.entryPrice.toLocaleString()}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>{isClosed ? "CLOSED AT" : "MARK PRICE"}</Text>
                  <Text style={styles.statVal}>${currentPrice.toLocaleString()}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>MARGIN</Text>
                  <Text style={styles.statVal}>${position.marginAUSD} AUSD</Text>
                </View>
              </View>

              {/* Verification Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.footerTag}>
                  <Text style={styles.footerTagText}>AGORA AUSD · PERPL PROTOCOL</Text>
                </View>
                <Text style={styles.hunchUrl}>hunch.trade</Text>
              </View>
            </View>

            {/* Action Row */}
            <View style={styles.actionRow}>
              <Pressable onPress={handleCopy} style={styles.copyBtn}>
                <Text style={styles.copyBtnText}>COPY PnL SUMMARY</Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>CLOSE</Text>
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
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentWrap: {
    width: "100%",
    maxWidth: 400,
  },
  scrollContent: {
    gap: 14,
    paddingVertical: 10,
  },
  card: {
    backgroundColor: "#0D111A",
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#222C3E",
    gap: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 25,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#222D12",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  logoGlyph: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "bold",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontFamily: type.bold,
    fontSize: 15,
    letterSpacing: 1,
  },
  brandSub: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141A26",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#222D42",
    gap: 5,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  networkText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  topCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1C2434",
    borderWidth: 1,
    borderColor: "#303E58",
    alignItems: "center",
    justifyContent: "center",
  },
  topCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  assetStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#131722",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#1E2536",
  },
  assetLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sidePill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  sideText: {
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  symbolText: {
    color: "#FFFFFF",
    fontFamily: type.bold,
    fontSize: 13,
  },
  statusBadge: {
    backgroundColor: "#1A2030",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTag: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  pnlSection: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 6,
  },
  pnlLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  pnlPctNumber: {
    fontFamily: type.bold,
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1,
  },
  usdBadge: {
    backgroundColor: "#121722",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#1E273A",
  },
  pnlUsdNumber: {
    fontFamily: type.bold,
    fontSize: 16,
    fontWeight: "700",
  },
  statsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#131722",
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#1F2738",
  },
  statCol: {
    gap: 3,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  statVal: {
    color: "#FFFFFF",
    fontFamily: type.bold,
    fontSize: 13,
    fontWeight: "bold",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  footerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerTagText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  hunchUrl: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  copyBtn: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.md,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  copyBtnText: {
    color: "#0A0B0D",
    fontFamily: type.bold,
    fontSize: 13,
    letterSpacing: 0.8,
  },
  closeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2232",
    borderWidth: 1.5,
    borderColor: "#303F5C",
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  closeBtnText: {
    color: "#FFFFFF",
    fontFamily: type.bold,
    fontSize: 13,
    letterSpacing: 0.8,
  },
});
