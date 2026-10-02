import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../api/client";
import { colors, type } from "../theme";

export function NetworkStatusBanner() {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    let failCount = 0;

    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${API_URL}/health`, {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache" },
        });
        clearTimeout(timeoutId);

        if (!mounted) return;

        if (res.ok) {
          if (failCount >= 2) {
            // Was offline, now reconnected
            setJustReconnected(true);
            setTimeout(() => {
              if (mounted) setJustReconnected(false);
            }, 2500);
          }
          failCount = 0;
          setIsOffline(false);
        } else {
          failCount++;
          if (failCount >= 2) setIsOffline(true);
        }
      } catch {
        if (!mounted) return;
        failCount++;
        if (failCount >= 2) setIsOffline(true);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 8000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!isOffline && !justReconnected) return null;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, 6) },
        justReconnected ? styles.reconnectedBg : styles.offlineBg,
      ]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.dot,
            justReconnected ? styles.greenDot : styles.amberDot,
          ]}
        />
        <Text
          style={[
            styles.statusText,
            justReconnected ? styles.greenText : styles.amberText,
          ]}
        >
          {justReconnected
            ? "CONNECTED · MONAD TESTNET"
            : "OFFLINE · RECONNECTING TO MONAD TESTNET..."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingBottom: 6,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  offlineBg: {
    backgroundColor: "#1A1508",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 176, 32, 0.4)",
  },
  reconnectedBg: {
    backgroundColor: "#081A12",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(46, 229, 157, 0.4)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  amberDot: {
    backgroundColor: "#FFB020",
  },
  greenDot: {
    backgroundColor: colors.up,
  },
  statusText: {
    fontFamily: type.data,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  amberText: {
    color: "#FFB020",
  },
  greenText: {
    color: colors.up,
  },
});
