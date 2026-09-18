import { Platform } from "react-native";

/**
 * Copy text without hard-crashing when native ExpoClipboard is missing
 * (dev client / Expo Go built before expo-clipboard was added).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }

  try {
    // Lazy require — static import throws at bundle load if native module is absent
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Clipboard = require("expo-clipboard");
    if (typeof Clipboard?.setStringAsync === "function") {
      await Clipboard.setStringAsync(text);
      return true;
    }
  } catch {
    /* native module not in this build */
  }

  return false;
}
