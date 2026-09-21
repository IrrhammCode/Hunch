import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth/AuthContext";
import { fetchZerionPortfolio } from "@/src/api/client";
import { Screen } from "@/src/components/Screen"
import { MockBanner } from "@/src/components/MockBanner";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import { copyToClipboard } from "@/src/utils/clipboard";
import { fundPrivyWallet } from "@/src/wallet/privyTrade";
import { useWallet } from "@/src/wallet/WalletContext";
import { colors, radius, space, type, monoStyle } from "@/src/theme";

function shortAddr(a: string) {
  if (!a) return "0x8f2a...4E9a";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, privyMode } = useAuth();
  const { me, error, refresh } = useWallet();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zerionNote, setZerionNote] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      (async () => {
        const addr = user?.address || me?.address;
        if (!addr) return;
        try {
          const z = await fetchZerionPortfolio(addr);
          if (z.configured && z.totalUSD != null) {
            const chg = z.change1dPct != null ? ` · 24h ${z.change1dPct.toFixed(2)}%` : "";
            setZerionNote(`Zerion portfolio $${z.totalUSD.toFixed(2)}${chg}`);
          } else if (z.configured && z.error) {
            setZerionNote(null);
          } else {
            setZerionNote(null);
          }
        } catch {
          setZerionNote(null);
        }
      })();
    }, [refresh, user?.address, me?.address]),
  );

  const address = user?.address || me?.address || "";
  const email = user?.email || "—";
  const ausdBalance = me?.ausd ? Number(me.ausd).toFixed(2) : "—";
  const monBalance = me?.mon ? Number(me.mon).toFixed(2) : "—";
  const totalVal = ausdBalance === "—" ? "—" : ausdBalance;

  const onCopy = async () => {
    if (!address) return;
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show("Copied", { body: "Address copied to clipboard", tone: "success" });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.show("Address", { body: address, tone: "neutral" });
    }
  };

  const onLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const onFaucet = async () => {
    setBusy(true);
    try {
      if (!user?.address) {
        toast.error("Wallet not ready", "Sign in with Mera passkey or Privy first.");
        return;
      }
      const r = await fundPrivyWallet(user.address);
      await refresh();
      toast.success(
        "Funded AUSD",
        `AUSD ${Number(r.ausd).toFixed(2)} · MON ${Number(r.mon).toFixed(3)}`,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      toast.error("Faucet failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
        {/* Top Network Bar */}
        <View style={styles.topStatus}>
          <View style={styles.statusLeft}>
            <View style={styles.greenDot} />
            <Text style={styles.networkText}>MONAD TESTNET</Text>
          </View>
        </View>
        <MockBanner />

        {/* Title Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>YOU</Text>
            <Text style={styles.sub}>Wallet, balances, faucet</Text>
          </View>
          <View style={styles.gearBtn}>
            <Icon name="settings-outline" size={20} color={colors.muted} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1, width: "100%", alignSelf: "stretch" }}
          contentContainerStyle={{
            width: "100%",
            alignItems: "stretch",
            gap: 12,
            paddingBottom: 36,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* USER IDENTITY CARD */}
          <View style={styles.userCard}>
            <View style={styles.avatarWrap}>
              <Icon name="person-circle" size={48} color={colors.brand} />
              <View style={styles.onlineBadgeDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.displayName || "Trader"}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>{email}</Text>
            </View>
            <View style={styles.onlineStatusCol}>
              <View style={styles.onlinePill}>
                <View style={styles.greenDot} />
                <Text style={styles.onlinePillText}>{privyMode ? "PRIVY" : "SETUP"}</Text>
              </View>
            </View>
          </View>

          {/* PRIVY EMBEDDED SMART WALLET CARD */}
          <View style={styles.walletCard}>
            <View style={styles.walletTop}>
              <View style={styles.walletLeftHeader}>
                <Icon name="shield-checkmark-outline" size={16} color={colors.brand} />
                <View>
                  <Text style={styles.walletTitle}>Privy Embedded Smart Wallet</Text>
                  <Text style={styles.walletSub}>Embedded wallet · Monad testnet</Text>
                </View>
              </View>
              <View style={styles.ercBadge}>
                
              </View>
            </View>

            {/* Address Row with Copy & QR */}
            <View style={styles.addrRow}>
              <View style={styles.addrPill}>
                <View style={styles.yellowDot} />
                <Text style={styles.addrText}>{shortAddr(address)}</Text>
              </View>
              <Pressable onPress={onCopy} style={styles.copyBtn}>
                <Icon name="copy-outline" size={16} color={colors.muted} />
                <Text style={styles.copyBtnText}>{copied ? "Copied" : "Copy"}</Text>
              </Pressable>
              <View style={styles.qrBtn}>
                <Icon name="qr-code-outline" size={16} color={colors.muted} />
              </View>
            </View>

            {/* Total Portfolio Balance */}
            <View style={styles.totalWrap}>
              <Text style={styles.totalLabel}>PORTFOLIO</Text>
              <View style={styles.totalRow}>
                <Text style={styles.totalVal}>{me ? Number(me.ausd).toFixed(2) : "—"}</Text>
                <Text style={styles.totalUnit}>AUSD</Text>
              </View>
              {zerionNote ? (
                <Text style={styles.zerionLine} numberOfLines={2}>
                  {zerionNote}
                </Text>
              ) : null}
            </View>

            {/* 2-Column Asset Breakdown */}
            <View style={styles.assetGrid}>
              <View style={styles.assetCol}>
                <View style={styles.assetHeader}>
                  <View style={[styles.assetIcon, { backgroundColor: "#0E2B1F" }]}>
                    <Text style={[styles.assetGlyph, { color: colors.up }]}>A</Text>
                  </View>
                  <Text style={styles.assetName}>AUSD (TESTNET)</Text>
                </View>
                <Text style={styles.assetAmount}>{ausdBalance}</Text>
                <Text style={styles.assetFiat}>${ausdBalance}</Text>
              </View>

              <View style={styles.assetCol}>
                <View style={styles.assetHeader}>
                  <View style={[styles.assetIcon, { backgroundColor: "rgba(131,110,249,0.2)" }]}>
                    <Text style={[styles.assetGlyph, { color: colors.monadPurple }]}>M</Text>
                  </View>
                  <Text style={styles.assetName}>MONAD GAS</Text>
                </View>
                <Text style={styles.assetAmount}>{monBalance} MON</Text>
                <Text style={styles.assetFiat}>${(Number(monBalance) * 3.5).toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* PROMINENT FAUCET CALLOUT CARD */}
          <View style={styles.faucetCard}>
            <View style={styles.faucetTop}>
              <View style={styles.faucetSparkWrap}>
                <Icon name="sparkles-outline" size={14} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.faucetTitleRow}>
                  <Text style={styles.faucetTitle}>Need Testnet Trading Funds?</Text>
                  <View style={styles.faucetBadge}>
                    <Text style={styles.faucetBadgeText}>FAUCET</Text>
                  </View>
                </View>
                <Text style={styles.faucetDesc}>
                  Request <Text style={styles.boldLime}>Agora AUSD</Text> testnet collateral and MON gas to trade on Perpl and 60s hunches.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onFaucet}
              disabled={busy}
              style={styles.faucetBtn}
            >
              {busy ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Icon name="water-outline" size={18} color="#0A0B0D" />
                  <Text style={styles.faucetBtnText}>CLAIM AUSD FAUCET</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* REAL WALLET STATS — no hardcoded performance */}
          <View style={styles.perfCard}>
            <View style={styles.perfTop}>
              <View style={styles.perfHeaderLeft}>
                <Text style={styles.perfTrendIcon}>↗</Text>
                <Text style={styles.perfTitle}>WALLET ACTIVITY</Text>
              </View>
              <Text style={styles.perfRange}>Onchain</Text>
            </View>

            <View style={styles.perfGrid}>
              <View style={styles.perfItem}>
                <Text style={styles.perfLabel}>AUSD BALANCE</Text>
                <Text style={styles.perfVal}>{ausdBalance}</Text>
              </View>
              <View style={styles.perfItem}>
                <Text style={styles.perfLabel}>MON GAS</Text>
                <Text style={styles.perfVal}>{monBalance}</Text>
              </View>
              <View style={styles.perfItem}>
                <Text style={styles.perfLabel}>HUNCH POSITIONS</Text>
                <Text style={styles.perfVal}>{String(me?.positions?.length ?? 0)}</Text>
              </View>
              <View style={styles.perfItem}>
                <Text style={styles.perfLabel}>REDEEMABLE</Text>
                <Text style={[styles.perfVal, { color: colors.up }]}>
                  {String((me?.positions ?? []).filter((p) => p.redeemable).length)}
                </Text>
              </View>
            </View>
          </View>

          {/* LOGOUT */}
          <Pressable onPress={onLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    paddingHorizontal: 14,
    backgroundColor: "#0A0B0D",
    paddingBottom: 0,
  },
  topStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.up,
  },
  purpleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.monadPurple,
  },
  networkText: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  pipe: {
    color: "#333742",
    fontSize: 10,
  },
  tpsText: {
    color: colors.brand,
    fontFamily: type.data,
    fontSize: 10,
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chainText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: colors.ink,
    fontFamily: type.display.fontFamily,
    fontSize: 26,
    letterSpacing: 1.2,
  },
  sub: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
    marginTop: 2,
  },
  gearBtn: {
    backgroundColor: "#14171F",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  gearIcon: {
    color: colors.muted,
    fontSize: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1C212D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#282F40",
  },
  avatarIcon: {
    fontSize: 20,
  },
  onlineBadgeDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.up,
    borderWidth: 2,
    borderColor: "#12141A",
  },
  userTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 15,
  },
  proBadge: {
    backgroundColor: "rgba(214,255,63,0.15)",
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(214,255,63,0.3)",
  },
  proText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 9,
  },
  userEmail: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 11,
    marginTop: 2,
  },
  onlineStatusCol: {
    alignItems: "flex-end",
    gap: 3,
  },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(46,229,157,0.12)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
  },
  onlinePillText: {
    color: colors.up,
    fontFamily: type.bold,
    fontSize: 9,
  },
  latencySub: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
  },
  walletCard: {
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  walletTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  walletLeftHeader: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
  },
  shieldIcon: {
    fontSize: 18,
  },
  walletTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 13,
  },
  walletSub: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 10,
    marginTop: 2,
  },
  ercBadge: {
    backgroundColor: "#1A1F2C",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  ercBadgeText: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 9,
  },
  addrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0D0F14",
    borderRadius: radius.md,
    padding: 8,
    marginBottom: 14,
  },
  addrPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  yellowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  addrText: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 12,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#171B24",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  copyIcon: {
    fontSize: 11,
  },
  copyBtnText: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 10,
  },
  qrBtn: {
    backgroundColor: "#171B24",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  qrIcon: {
    color: colors.ink,
    fontSize: 12,
  },
  totalWrap: {
    marginBottom: 12,
  },
  zerionLine: {
    color: colors.brand,
    fontFamily: type.medium,
    fontSize: 12,
    marginTop: 6,
  },
  totalLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  totalVal: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 28,
    fontWeight: "800",
  },
  totalUnit: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 13,
  },
  assetGrid: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#1A1E29",
    paddingTop: 12,
  },
  assetCol: {
    flex: 1,
    backgroundColor: "#0E1117",
    borderRadius: radius.md,
    padding: 10,
  },
  assetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  assetIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  assetGlyph: {
    fontSize: 10,
    fontWeight: "bold",
  },
  assetName: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 9,
  },
  assetAmount: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 13,
    fontWeight: "bold",
  },
  assetFiat: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
    marginTop: 2,
  },
  faucetCard: {
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(214,255,63,0.3)",
  },
  faucetTop: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  faucetSparkWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(214,255,63,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  faucetSparkIcon: {
    color: colors.brand,
    fontSize: 16,
  },
  faucetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  faucetTitle: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 13,
  },
  faucetBadge: {
    backgroundColor: "rgba(131,110,249,0.2)",
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  faucetBadgeText: {
    color: colors.monadPurple,
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "bold",
  },
  faucetDesc: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  boldLime: {
    color: colors.brand,
    fontFamily: type.bold,
  },
  faucetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    paddingVertical: 13,
    borderRadius: radius.pill,
    gap: 8,
  },
  faucetBtnIcon: {
    fontSize: 14,
  },
  faucetBtnText: {
    color: "#000",
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  instantTag: {
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  instantTagText: {
    color: "#000",
    fontFamily: type.data,
    fontSize: 9,
    fontWeight: "bold",
  },
  perfCard: {
    backgroundColor: "#12141A",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  perfTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  perfHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  perfTrendIcon: {
    color: colors.up,
    fontSize: 12,
    fontWeight: "bold",
  },
  perfTitle: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  perfRange: {
    color: colors.muted,
    fontFamily: type.data,
    fontSize: 10,
  },
  perfGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  perfItem: {
    width: "47%",
    backgroundColor: "#0E1117",
    padding: 10,
    borderRadius: radius.md,
    gap: 2,
  },
  perfLabel: {
    color: colors.muted,
    fontFamily: type.bold,
    fontSize: 8,
    letterSpacing: 0.6,
  },
  perfVal: {
    color: colors.ink,
    fontFamily: type.data,
    fontSize: 14,
    fontWeight: "bold",
  },
  logoutBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutText: {
    color: colors.down,
    fontFamily: type.bold,
    fontSize: 12,
  },
});
