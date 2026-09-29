from pathlib import Path
root = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile")
# Fix Haptics stub to accept optional args
old_impact = 'impactAsync: () => hapticFx("medium"),'
new_impact = 'impactAsync: (_style?: unknown) => hapticFx("medium"),'
old_notif = 'notificationAsync: (t: any) => hapticFx(t === 2 ? "error" : t === 1 ? "warning" : "success"),'
new_notif = 'notificationAsync: (t?: number) => hapticFx(t === 2 ? "error" : t === 1 ? "warning" : "success"),'
for p in root.rglob("*.tsx"):
    if "node_modules" in str(p):
        continue
    t = p.read_text(encoding="utf-8")
    t2 = t.replace(old_impact, new_impact).replace(old_notif, new_notif)
    if t2 != t:
        p.write_text(t2, encoding="utf-8")
        print("fixed", p.name)
print("done")
