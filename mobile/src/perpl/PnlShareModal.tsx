import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { colors, radius, space, type, monoStyle } from "@/src/theme";
import { copyToClipboard, haptic } from "@/src/utils/clipboard";
import { useToast } from "@/src/components/Toast";
import type { PerplPosition } from "@/src/api/client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

              <View style={styles.networkBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.networkText}>MONAD TESTNET</Text>
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
                          ? "rgba(46,229,157,0.15)"
                          : "rgba(255,77,106,0.15)",
                      borderColor:
                        position.side === "LONG"
                          ? "rgba(46,229,157,0.4)"
                          : "rgba(255,77,106,0.4)",
                    },
                  ]}
                >
                  <Text style={[styles.sideText, { color: pnlColor }]}>
                    {position.side} {position.leverage}X
                  </Text>
                </View>
                <Text style={styles.symbolText}>{position.symbol} / AUSD PERP</Text>
              </View>
              <Text style={styles.statusTag}>{isClosed ? "CLOSED" : "LIVE POSITION"}</Text>
            </View>

            {/* Big Hero PnL */}
            <View style={styles.pnlSection}>
              <Text style={styles.pnlLabel}>RETURN ON MARGIN</Text>
              <Text style={[styles.pnlPctNumber, { color: pnlColor }]}>
                {isProfitable ? "+" : ""}
                {pnlPct.toFixed(1)}%
              </Text>
              <Text style={[styles.pnlUsdNumber, { color: pnlColor }]}>
                {isProfitable ? "+" : ""}${pnlAUSD.toFixed(2)} AUSD
              </Text>
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
              <Text style={styles.closeBtnText}>DONE</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    maxWidth: 380,
    gap: 14,
  },
  card: {
    backgroundColor: "#0D1017",
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "rgba(214,255,63,0.4)",
    gap: 16,
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
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "rgba(214,255,63,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(214,255,63,0.3)",
  },
  logoGlyph: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "bold",
  },
  brandTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 14,
    letterSpacing: 1,
  },
  brandSub: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161B26",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#222A3B",
    gap: 5,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  networkText: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 8,
    fontWeight: "bold",
  },
  assetStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#131722",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  assetLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sidePill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  sideText: {
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  symbolText: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 12,
  },
  statusTag: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
  },
  pnlSection: {
    alignItems: "center",
    paddingVertical: 6,
    gap: 2,
  },
  pnlLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  pnlPctNumber: {
    fontFamily: type.data,
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1,
  },
  pnlUsdNumber: {
    fontFamily: type.data,
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
  },
  statCol: {
    gap: 2,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  statVal: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 12,
    fontWeight: "bold",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  footerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerTagIcon: {
    fontSize: 10,
  },
  footerTagText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  hunchUrl: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "bold",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  copyBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  copyBtnIcon: {
    fontSize: 14,
  },
  copyBtnText: {
    color: "#000000",
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  closeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161A23",
    borderWidth: 1,
    borderColor: "#222735",
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  closeBtnText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
});
