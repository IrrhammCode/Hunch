from pathlib import Path
root = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile")
repls = {
    "â€”": "—",
    "â€¦": "...",
    "Â·": "·",
    "Â": "",
    "â†’": "->",
    "â€™": "'",
    "â€œ": '"',
    "â€": "-",
}
n = 0
for p in root.rglob("*.ts*"):
    if "node_modules" in str(p):
        continue
    t = p.read_text(encoding="utf-8", errors="replace")
    orig = t
    for a, b in repls.items():
        t = t.replace(a, b)
    if t != orig:
        p.write_text(t, encoding="utf-8")
        n += 1
        print("clean", p.name)
print("total", n)
