from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(app)\profile.tsx")
t = p.read_text(encoding="utf-8")
old = """  const onLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };"""
new = """  const onLogout = async () => {
    try {
      await logout();
    } finally {
      // Keep auth screens visible after sign-out (never bounce back into the app).
      router.replace("/(auth)/login");
    }
  };"""
if old not in t:
    raise SystemExit("onLogout not found")
p.write_text(t.replace(old, new), encoding="utf-8")
print("profile onLogout fixed")
