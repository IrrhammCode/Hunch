from pathlib import Path
for name in ("login.tsx", "signup.tsx"):
    p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(auth)") / name
    t = p.read_text(encoding="utf-8", errors="replace")
    t = t.replace("â€”", "—")
    t = t.replace("â€¦", "…")
    t = t.replace("Â·", "·")
    t = t.replace("Â", "")
    t = t.replace("â€™", "'")
    t = t.replace("â€œ", '"').replace("â€\x9d", '"')
    p.write_text(t, encoding="utf-8")
    print("cleaned", name)
