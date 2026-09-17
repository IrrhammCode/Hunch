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
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              </View>
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
    left: space.lg,
    right: space.lg,
    zIndex: 1000,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  success: {
    backgroundColor: "rgba(46,229,157,0.12)",
    borderColor: "rgba(46,229,157,0.4)",
  },
  error: {
    backgroundColor: "rgba(255,77,106,0.12)",
    borderColor: "rgba(255,77,106,0.45)",
  },
  neutral: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.lineStrong,
  },
  inner: {
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(214,255,63,0.12)",
  },
  actionText: {
    color: colors.brand,
    fontFamily: type.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  textCol: { gap: 2, flex: 1 },
  title: {
    color: colors.ink,
    fontFamily: type.bold,
    fontSize: 14,
  },
  body: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
