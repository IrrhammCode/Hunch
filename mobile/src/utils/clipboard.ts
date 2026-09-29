import { Platform } from "react-native";

/**
 * Copy without crashing when native ExpoClipboard is missing
 * (web, Expo Go, or dev client built before expo-clipboard).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (
      Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      navigator.clipboard?.writeText
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }

  try {
    const RN = require("react-native") as any;
    const legacy = RN.Clipboard;
    if (legacy?.setString) {
      legacy.setString(text);
      return true;
    }
  } catch {
    /* ignore */
  }

  return false;
}

/** Haptics that never crash on web / missing native. */
export async function haptic(
  kind: "selection" | "light" | "medium" | "success" | "warning" | "error" = "selection",
) {
  if (Platform.OS === "web") return;
  try {
    const Haptics = require("expo-haptics") as any;
    if (kind === "selection") await Haptics.selectionAsync();
    else if (kind === "light") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle?.Light);
    else if (kind === "medium") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle?.Medium);
    else if (kind === "success")
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType?.Success);
    else if (kind === "warning")
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType?.Warning);
    else if (kind === "error")
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType?.Error);
  } catch {
    /* optional */
  }
}
