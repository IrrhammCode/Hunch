import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from "react-native";
import { colors, radius, space, type, monoStyle } from "@/src/theme";
import { Icon } from "@/src/components/Icon";
import { haptic, copyToClipboard } from "@/src/utils/clipboard";
import { useToast } from "@/src/components/Toast";
import { explorerAddress } from "@/src/config/chain";
import { AUSD_TOKEN_ADDRESS } from "./privyTrade";

const AGORA_FAUCET_ADDRESS = "0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C";

interface AgoraHubCardProps {
  walletAUSD: string;
  perplMarginAUSD?: string;
  onOpenMarginModal?: () => void;
  onClaimFaucet: () => void;
  faucetBusy?: boolean;
}

export function AgoraHubCard({
  walletAUSD,
  perplMarginAUSD = "0.00",
  onOpenMarginModal,
  onClaimFaucet,
  faucetBusy = false,
}: AgoraHubCardProps) {
  const toast = useToast();

  const numWallet = parseFloat(walletAUSD.replace(/,/g, "")) || 0;
  const numPerpl = parseFloat(perplMarginAUSD.replace(/,/g, "")) || 0;
  const totalAUSD = (numWallet + numPerpl).toFixed(2);

  const onCopyContract = async () => {
    await copyToClipboard(AUSD_TOKEN_ADDRESS);
    await haptic("selection");
    toast.show("Contract Copied", {
      body: "Agora AUSD address copied to clipboard",
      tone: "success",
    });
  };

  const onOpenExplorer = () => {
    haptic("light");
    const url = explorerAddress(AUSD_TOKEN_ADDRESS, "monad");
    Linking.openURL(url).catch(() => {});
  };

  const onOpenAgoraDocs = () => {
    haptic("light");
    Linking.openURL("https://docs.agora.finance").catch(() => {});
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.agoraGlyphWrap}>
            <Text style={styles.agoraGlyphText}>A</Text>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>AGORA AUSD HUB</Text>
              <View style={styles.partnerBadge}>
                <Text style={styles.partnerBadgeText}>OFFICIAL PARTNER</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Institutional 1:1 Digital Dollar · VanEck Backed
            </Text>
          </View>
        </View>

        <Pressable onPress={onOpenAgoraDocs} style={styles.docsBtn} hitSlop={8}>
          <Icon name="open-outline" size={14} color={colors.muted} />
        </Pressable>
      </View>

      {/* Net Worth Display */}
      <View style={styles.netWorthBox}>
        <Text style={styles.netWorthLabel}>TOTAL AGORA AUSD VALUE</Text>
        <View style={styles.netWorthRow}>
          <Text style={styles.netWorthVal}>${totalAUSD}</Text>
          <Text style={styles.netWorthUnit}>AUSD</Text>
        </View>
      </View>

      {/* 2-Way Multi-Product Allocation */}
      <View style={styles.allocationGrid}>
        <View style={styles.allocCol}>
          <View style={styles.allocHeader}>
            <View style={[styles.allocDot, { backgroundColor: colors.up }]} />
            <Text style={styles.allocTitle}>WALLET CASH (EOA)</Text>
          </View>
          <Text style={styles.allocAmount}>${walletAUSD}</Text>
          <Text style={styles.allocSub}>Liquid passkey balance</Text>
        </View>

        <View style={styles.allocDivider} />

        <View style={styles.allocCol}>
          <View style={styles.allocHeader}>
            <View style={[styles.allocDot, { backgroundColor: colors.brand }]} />
            <Text style={styles.allocTitle}>PERPL MARGIN</Text>
          </View>
          <Text style={[styles.allocAmount, { color: colors.brand }]}>
            ${perplMarginAUSD}
          </Text>
          <Text style={styles.allocSub}>Leveraged perps collateral</Text>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        {onOpenMarginModal ? (
          <Pressable
            onPress={onOpenMarginModal}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          >
            <Icon name="swap-horizontal" size={14} color={colors.brand} />
            <Text style={styles.actionBtnText}>Manage Margin</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onClaimFaucet}
          disabled={faucetBusy}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.faucetActionBtn,
            pressed && styles.actionBtnPressed,
          ]}
        >
          {faucetBusy ? (
            <ActivityIndicator size="small" color="#00E5FF" />
          ) : (
            <>
              <Icon name="water-outline" size={14} color="#00E5FF" />
              <Text style={[styles.actionBtnText, { color: "#00E5FF" }]}>
                Claim AUSD
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Contract & Explorer Footer Bar */}
      <View style={styles.footerBar}>
        <Pressable onPress={onCopyContract} style={styles.contractRow}>
          <Text style={styles.footerLabel}>TOKEN:</Text>
          <Text style={styles.footerAddress} numberOfLines={1}>
            {AUSD_TOKEN_ADDRESS.slice(0, 8)}…{AUSD_TOKEN_ADDRESS.slice(-6)}
          </Text>
          <Icon name="copy-outline" size={12} color={colors.muted} />
        </Pressable>

        <Pressable onPress={onOpenExplorer} style={styles.explorerLinkRow}>
          <Text style={styles.explorerLinkText}>MonadVision</Text>
          <Icon name="open-outline" size={11} color={colors.brand} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0D111A",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E2738",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  agoraGlyphWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0E2B1F",
    borderWidth: 1.5,
    borderColor: "rgba(46, 229, 157, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  agoraGlyphText: {
    fontFamily: type.data,
    fontSize: 18,
    fontWeight: "900",
    color: colors.up,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontFamily: type.bold,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  partnerBadge: {
    backgroundColor: "rgba(46, 229, 157, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(46, 229, 157, 0.25)",
  },
  partnerBadgeText: {
    fontFamily: type.data,
    fontSize: 8,
    fontWeight: "800",
    color: colors.up,
  },
  subtitle: {
    fontFamily: type.body,
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 2,
  },
  docsBtn: {
    padding: 4,
  },
  netWorthBox: {
    backgroundColor: "#131924",
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#202A3C",
  },
  netWorthLabel: {
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  netWorthRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  netWorthVal: {
    fontFamily: type.data,
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
  },
  netWorthUnit: {
    fontFamily: type.bold,
    fontSize: 12,
    color: colors.up,
  },
  allocationGrid: {
    flexDirection: "row",
    backgroundColor: "#131924",
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#1E273A",
  },
  allocCol: {
    flex: 1,
    gap: 2,
  },
  allocDivider: {
    width: 1,
    backgroundColor: "#202A3C",
    marginHorizontal: 10,
  },
  allocHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  allocDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  allocTitle: {
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "700",
    color: colors.muted,
  },
  allocAmount: {
    fontFamily: type.data,
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  allocSub: {
    fontFamily: type.body,
    fontSize: 9,
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
    backgroundColor: "#161D2B",
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#243044",
    gap: 6,
  },
  faucetActionBtn: {
    borderColor: "rgba(0, 229, 255, 0.3)",
    backgroundColor: "rgba(0, 229, 255, 0.06)",
  },
  actionBtnPressed: {
    backgroundColor: "#1E2638",
  },
  actionBtnText: {
    fontFamily: type.data,
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  footerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#171E2C",
    paddingTop: 8,
  },
  contractRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  footerLabel: {
    fontFamily: type.data,
    fontSize: 9,
    color: colors.muted,
    fontWeight: "700",
  },
  footerAddress: {
    fontFamily: type.data,
    fontSize: 10,
    color: colors.ink,
  },
  explorerLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  explorerLinkText: {
    fontFamily: type.data,
    fontSize: 10,
    color: colors.brand,
    fontWeight: "600",
  },
});
