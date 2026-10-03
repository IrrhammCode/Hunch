import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { Icon } from "@/src/components/Icon";
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
  const cardRef = useRef<View>(null);
  const [sharingImage, setSharingImage] = useState(false);

  if (!position) return null;

  const isClosed = position.status === "CLOSED";
  const pnlAUSD = isClosed
    ? (position.realizedPnLAUSD ?? position.realizedPnL ?? position.unrealizedPnLAUSD ?? 0)
    : (position.unrealizedPnLAUSD ?? 0);

  const currentPrice = isClosed
    ? (position.closedPrice ?? position.markPrice ?? position.entryPrice)
    : (position.markPrice ?? position.entryPrice);

  // Derive accurate margin: check marginAUSD, or compute from size * entryPrice / leverage
  let effectiveMargin = position.marginAUSD > 0 ? position.marginAUSD : 0;
  if (effectiveMargin <= 0 && position.size > 0 && position.entryPrice > 0 && position.leverage > 0) {
    effectiveMargin = (position.size * position.entryPrice) / position.leverage;
  }
  if (effectiveMargin <= 0 && position.sizeAUSD > 0 && position.leverage > 0) {
    effectiveMargin = position.sizeAUSD / position.leverage;
  }
  if (effectiveMargin <= 0 && pnlAUSD !== 0 && position.unrealizedPnLPct && position.unrealizedPnLPct !== 0) {
    effectiveMargin = Math.abs(pnlAUSD / (position.unrealizedPnLPct / 100));
  }

  // Derive accurate PnL %
  let pnlPct = 0;
  if (effectiveMargin > 0) {
    pnlPct = (pnlAUSD / effectiveMargin) * 100;
  } else if (position.entryPrice > 0 && currentPrice > 0 && position.leverage > 0) {
    const priceDeltaPct =
      ((currentPrice - position.entryPrice) / position.entryPrice) *
      (position.side === "LONG" ? 1 : -1);
    pnlPct = priceDeltaPct * position.leverage * 100;
  } else if (position.unrealizedPnLPct != null && position.unrealizedPnLPct !== 0) {
    pnlPct = position.unrealizedPnLPct;
  }

  const isProfitable = pnlAUSD >= 0;
  const pnlColor = isProfitable ? colors.up : colors.down;

  const downloadWebCanvasImage = async () => {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dark background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1080);
    bgGrad.addColorStop(0, "#0D111A");
    bgGrad.addColorStop(1, "#07090E");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Border
    ctx.strokeStyle = "#222C3E";
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, 1032, 1032);

    // Ambient radial glow behind PnL
    const radial = ctx.createRadialGradient(540, 540, 50, 540, 540, 450);
    radial.addColorStop(0, isProfitable ? "rgba(46, 229, 157, 0.16)" : "rgba(255, 77, 106, 0.16)");
    radial.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 1080, 1080);

    // Header: Brand & Network
    ctx.fillStyle = "#D6FF3F";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("▲ HUNCH", 70, 120);

    ctx.fillStyle = "#8B8E97";
    ctx.font = "600 24px sans-serif";
    ctx.fillText("DEX TERMINAL · MONAD TESTNET", 70, 160);

    // Asset & Side badge
    const badgeColor = position.side === "LONG" ? "#2EE59D" : "#FF4D6A";
    const badgeBg = position.side === "LONG" ? "#0E291C" : "#321118";

    // Draw Pill
    ctx.fillStyle = badgeBg;
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(70, 220, 240, 60, 30);
    } else {
      ctx.rect(70, 220, 240, 60);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = badgeColor;
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(`${position.side} ${position.leverage}X`, 100, 262);

    ctx.fillStyle = "#F2F1EC";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(`${position.symbol} / AUSD PERP`, 340, 264);

    // Main Return Label
    ctx.fillStyle = "#8B8E97";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("RETURN ON MARGIN", 70, 400);

    // Giant PnL %
    ctx.fillStyle = isProfitable ? "#2EE59D" : "#FF4D6A";
    ctx.font = "bold 120px sans-serif";
    const sign = isProfitable ? "+" : "";
    ctx.fillText(`${sign}${pnlPct.toFixed(1)}%`, 70, 520);

    // USD Amount badge
    ctx.fillStyle = isProfitable ? "rgba(46, 229, 157, 0.16)" : "rgba(255, 77, 106, 0.16)";
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(70, 560, 380, 64, 12);
    } else {
      ctx.rect(70, 560, 380, 64);
    }
    ctx.fill();

    ctx.fillStyle = isProfitable ? "#2EE59D" : "#FF4D6A";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(`${sign}$${pnlAUSD.toFixed(2)} AUSD`, 95, 604);

    // Stats Grid Box
    ctx.fillStyle = "#121722";
    ctx.strokeStyle = "#202838";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(70, 690, 940, 160, 16);
    } else {
      ctx.rect(70, 690, 940, 160);
    }
    ctx.fill();
    ctx.stroke();

    // Stats Columns
    ctx.fillStyle = "#8B8E97";
    ctx.font = "600 20px sans-serif";
    ctx.fillText("ENTRY PRICE", 110, 745);
    ctx.fillText(isClosed ? "CLOSED AT" : "MARK PRICE", 430, 745);
    ctx.fillText("MARGIN", 750, 745);

    ctx.fillStyle = "#F2F1EC";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(`$${position.entryPrice.toLocaleString()}`, 110, 800);
    const marginStr = effectiveMargin > 0
      ? `$${effectiveMargin.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} AUSD`
      : "CROSS";
    ctx.fillText(marginStr, 750, 800);

    // Footer
    ctx.fillStyle = "#5A6170";
    ctx.font = "600 22px sans-serif";
    ctx.fillText("AGORA AUSD · PERPL PROTOCOL", 70, 950);

    ctx.fillStyle = "#D6FF3F";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText("hunch.trade", 840, 950);

    // Trigger download
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `hunch-pnl-${position.symbol}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShareImage = async () => {
    try {
      setSharingImage(true);
      await haptic("medium");

      if (Platform.OS === "web") {
        await downloadWebCanvasImage();
        await haptic("success");
        toast.show("Image Downloaded", {
          body: "PnL card saved to your downloads.",
          tone: "success",
        });
        return;
      }

      if (!cardRef.current) {
        throw new Error("Card view not ready");
      }

      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1.0,
        result: "tmpfile",
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: `Share ${position.symbol} PnL`,
          UTI: "public.png",
        });
        await haptic("success");
      } else {
        await handleCopy();
        toast.show("Sharing unavailable", {
          body: "Copied text summary to clipboard instead.",
          tone: "neutral",
        });
      }
    } catch (err: any) {
      console.warn("Failed to capture/share image:", err);
      toast.show("Download Failed", {
        body: err?.message || "Could not generate image, copied text instead.",
        tone: "error",
      });
      await handleCopy();
    } finally {
      setSharingImage(false);
    }
  };

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
            <View ref={cardRef} collapsable={false} style={styles.card}>
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
                  <Text style={styles.statVal}>
                    {effectiveMargin > 0
                      ? `$${effectiveMargin.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} AUSD`
                      : "CROSS"}
                  </Text>
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

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <Pressable
                onPress={handleShareImage}
                disabled={sharingImage}
                style={[styles.shareImageBtn, sharingImage && { opacity: 0.7 }]}
              >
                {sharingImage ? (
                  <ActivityIndicator size="small" color="#0A0B0D" />
                ) : (
                  <>
                    <Icon name="download-outline" size={17} color="#0A0B0D" />
                    <Text style={styles.shareImageBtnText}>DOWNLOAD / SHARE IMAGE</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.secondaryRow}>
                <Pressable onPress={handleCopy} style={styles.copyBtn}>
                  <Icon name="copy-outline" size={15} color={colors.ink} />
                  <Text style={styles.copyBtnText}>COPY TEXT</Text>
                </Pressable>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>CLOSE</Text>
                </Pressable>
              </View>
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
  actionContainer: {
    gap: 10,
    marginTop: 4,
  },
  shareImageBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.md,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  shareImageBtnText: {
    color: "#0A0B0D",
    fontFamily: type.bold,
    fontSize: 13,
    letterSpacing: 0.8,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  copyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#161D2B",
    borderWidth: 1,
    borderColor: "#263248",
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  copyBtnText: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  closeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#11151F",
    borderWidth: 1,
    borderColor: "#1E2536",
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  closeBtnText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
