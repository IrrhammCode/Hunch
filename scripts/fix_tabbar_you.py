from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(app)\_layout.tsx")
t = p.read_text(encoding="utf-8")
old = """      {state.routes.map((route, index) => {
        const label = TAB_LABELS[route.name];
        if (!label) return null;"""
new = """      {state.routes.map((route, index) => {
        const label = TAB_LABELS[route.name];
        // Only MARKETS / TRADE / PORTFOLIO / YOU — never extra YOU from detail screens
        if (!label || label === "YOU" && route.name !== "profile") return null;
        if (!label) return null;"""
if old not in t:
    print("pattern missing")
else:
    t = t.replace(old, new)
    p.write_text(t, encoding="utf-8")
    print("tabbar hardened")
