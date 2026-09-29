from pathlib import Path
root = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile")
old = 'import * as Haptics from "expo-haptics";'
new = '''import { haptic as hapticFx } from "@/src/utils/clipboard";
const Haptics = {
  selectionAsync: () => hapticFx("selection"),
  impactAsync: () => hapticFx("medium"),
  notificationAsync: (t: any) => hapticFx(t === 2 ? "error" : t === 1 ? "warning" : "success"),
  ImpactFeedbackStyle: { Medium: "medium", Light: "light" },
  NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
};'''
n = 0
for p in root.rglob("*.tsx"):
    if "node_modules" in str(p):
        continue
    t = p.read_text(encoding="utf-8")
    if old in t:
        t = t.replace(old, new)
        p.write_text(t, encoding="utf-8")
        n += 1
        print("patched", p.name)
print("total", n)
