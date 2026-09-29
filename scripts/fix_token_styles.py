from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(app)\markets.tsx")
t = p.read_text(encoding="utf-8")
if "featuredHeadLeft" not in t.split("StyleSheet.create")[1] if "StyleSheet.create" in t else True:
    t = t.replace(
        "  featuredHead: {",
        "  featuredHeadLeft: {\n    flexDirection: \"row\",\n    alignItems: \"center\",\n    gap: 8,\n  },\n  featuredHead: {",
    )
    p.write_text(t, encoding="utf-8")
    print("style added")
else:
    # force insert if missing in styles only
    if "featuredHeadLeft:" not in t:
        t = t.replace(
            "  featuredHead: {",
            "  featuredHeadLeft: {\n    flexDirection: \"row\",\n    alignItems: \"center\",\n    gap: 8,\n  },\n  featuredHead: {",
        )
        p.write_text(t, encoding="utf-8")
        print("style forced")
    else:
        print("style exists")

# market-detail
p2 = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(app)\market-detail.tsx")
t2 = p2.read_text(encoding="utf-8")
print("TokenLogo import", "TokenLogo" in t2)
print("TokenBadge left", "TokenBadge" in t2)
print("TokenLogo use", "<TokenLogo" in t2)
