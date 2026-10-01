import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space, type } from "../theme";

type ToastTone = "success" | "error" | "neutral";

type ToastItem = {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastApi = {
  show: (
    title: string,
    opts?: {
      body?: string;
      tone?: ToastTone;
      actionLabel?: string;
      onAction?: () => void;
    },
  ) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

let seq = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setItem(null);
  }, []);

  const show = useCallback(
    (
      title: string,
      opts?: {
        body?: string;
        tone?: ToastTone;
        actionLabel?: string;
        onAction?: () => void;
      },
    ) => {
      if (timer.current) clearTimeout(timer.current);
      const next: ToastItem = {
        id: seq++,
        title,
        body: opts?.body,
        tone: opts?.tone ?? "neutral",
        actionLabel: opts?.actionLabel,
        onAction: opts?.onAction,
      };
      setItem(next);
      timer.current = setTimeout(() => setItem(null), next.tone === "error" ? 3600 : 3500);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, body) => show(title, { body, tone: "success" }),
      error: (title, body) => show(title, { body, tone: "error" }),
    }),
    [show],
  );

  const toneStyle =
    item?.tone === "success"
      ? styles.success
      : item?.tone === "error"
        ? styles.error
        : styles.neutral;

  const badgeComponent = () => {
    if (item?.tone === "success") {
      return (
        <View style={styles.badgeSuccess}>
          <Text style={styles.badgeSuccessText}>SUCCESS</Text>
        </View>
      );
    }
    if (item?.tone === "error") {
      return (
        <View style={styles.badgeError}>
          <Text style={styles.badgeErrorText}>ERROR</Text>
        </View>
      );
    }
    return (
      <View style={styles.badgeNeutral}>
        <Text style={styles.badgeNeutralText}>NOTICE</Text>
      </View>
    );
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {item ? (
        <Animated.View
          key={item.id}
          entering={FadeInDown.duration(180)}
          exiting={FadeOutUp.duration(160)}
          style={[styles.wrap, { top: insets.top + 12 }, toneStyle]}
          pointerEvents="box-none"
        >
          <Pressable onPress={dismiss} style={styles.inner}>
            <View style={styles.rowBetween}>
              <View style={styles.textCol}>
                <View style={styles.headerRow}>
                  {badgeComponent()}
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>
                {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              </View>

              <View style={styles.actionsRow}>
                {item.actionLabel && item.onAction ? (
                  <Pressable
                    onPress={() => {
                      item.onAction?.();
                      dismiss();
                    }}
                    hitSlop={8}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionText}>{item.actionLabel}</Text>
                  </Pressable>
                ) : null}

                <Pressable onPress={dismiss} hitSlop={12} style={styles.dismissBtn}>
                  <Text style={styles.dismissText}>✕</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: space.md,
    right: space.md,
    zIndex: 99999,
    elevation: 30,
    borderRadius: radius.md,
    borderWidth: 2,
    borderLeftWidth: 6,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.85,
    shadowRadius: 16,
  },
  success: {
    backgroundColor: "#0C1F16",
    borderColor: "#2EE59D",
    borderLeftColor: "#2EE59D",
  },
  error: {
    backgroundColor: "#220B11",
    borderColor: "#FF4D6A",
    borderLeftColor: "#FF4D6A",
  },
  neutral: {
    backgroundColor: "#131722",
    borderColor: "#D6FF3F",
    borderLeftColor: "#D6FF3F",
  },
  inner: {
    paddingHorizontal: space.md,
    paddingVertical: 14,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  textCol: {
    gap: 4,
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgeSuccess: {
    backgroundColor: "#163826",
    borderColor: "#2EE59D",
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeSuccessText: {
    color: "#2EE59D",
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  badgeError: {
    backgroundColor: "#3A121B",
    borderColor: "#FF4D6A",
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeErrorText: {
    color: "#FF4D6A",
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  badgeNeutral: {
    backgroundColor: "#2B3314",
    borderColor: "#D6FF3F",
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeNeutralText: {
    color: "#D6FF3F",
    fontFamily: type.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#D6FF3F",
  },
  actionText: {
    color: "#0A0B0D",
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  dismissText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    color: "#FFFFFF",
    fontFamily: type.bold,
    fontSize: 15,
    flex: 1,
  },
  body: {
    color: "#E2E8F0",
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
