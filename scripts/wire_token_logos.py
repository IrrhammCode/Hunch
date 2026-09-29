from pathlib import Path

# markets.tsx — use TokenLogo everywhere
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(app)\markets.tsx")
t = p.read_text(encoding="utf-8")
t = t.replace(
    'import { AssetGlyph, Icon } from "@/src/components/Icon";',
    'import { Icon } from "@/src/components/Icon";\nimport { TokenLogo } from "@/src/components/TokenLogo";',
)
# featured chart badge
t = t.replace(
    '              <Text style={styles.featuredTitle}>BTC · LIVE CHART</Text>',
    '              <View style={styles.featuredHeadLeft}>\n                <TokenLogo symbol="BTC" size={22} />\n                <Text style={styles.featuredTitle}>BTC · LIVE CHART</Text>\n              </View>',
)

# perp row icons
old_perp_icon = '''              const isMon = m.symbol === "MON";
              const isBtc = m.symbol === "BTC";
              const isSol = m.symbol === "SOL";
              const isPump = m.symbol === "PUMP";
              const iconBg = isMon ? "#836EF9" : isBtc ? "#F7931A" : isSol ? "#14F195" : "#FF007A";
              const isEth = m.symbol === "ETH";
              const iconGlyph = isMon ? "M" : isBtc ? "₿" : isEth ? "Ξ" : isSol ? "◎" : (m.symbol || "•").charAt(0);

              return (
                <Pressable
                  key={`perp-${m.id}`}
                  onPress={() => openPerpTrade(m)}
                  style={styles.marketRow}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.tokenIcon, { backgroundColor: iconBg }]}>
                      <Text style={styles.tokenGlyph}>{iconGlyph}</Text>
                    </View>'''
new_perp_icon = '''              return (
                <Pressable
                  key={`perp-${m.id}`}
                  onPress={() => openPerpTrade(m)}
                  style={styles.marketRow}
                >
                  <View style={styles.rowLeft}>
                    <TokenLogo symbol={m.symbol} size={36} />'''
if old_perp_icon in t:
    t = t.replace(old_perp_icon, new_perp_icon)
else:
    print("perp icon block missing")

# blitz row icons
old_blitz = '''              hunchMarkets.map((row) => {
                const iconBg =
                  row.symbol === "BTC" ? "#F7931A" : row.symbol === "ETH" ? "#627EEA" : row.symbol === "SOL" ? "#14F195" : "#836EF9";
                const glyph = row.symbol === "BTC" ? "₿" : row.symbol === "ETH" ? "Ξ" : row.symbol === "SOL" ? "◎" : row.symbol.charAt(0);
                const yesC = row.spot ? Number(row.spot.yes) * 100 : null;
                return (
                  <Pressable
                    key={`blitz-${row.chain}-${row.symbol}`}
                    onPress={() => openHunchTrade(row)}
                    style={styles.marketRow}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.tokenIcon, { backgroundColor: iconBg }]}>
                        <Text style={styles.tokenGlyph}>{glyph}</Text>
                      </View>'''
new_blitz = '''              hunchMarkets.map((row) => {
                const yesC = row.spot ? Number(row.spot.yes) * 100 : null;
                return (
                  <Pressable
                    key={`blitz-${row.chain}-${row.symbol}`}
                    onPress={() => openHunchTrade(row)}
                    style={styles.marketRow}
                  >
                    <View style={styles.rowLeft}>
                      <TokenLogo symbol={row.symbol} size={36} />'''
if old_blitz in t:
    t = t.replace(old_blitz, new_blitz)
else:
    print("blitz icon block missing")

# featuredHead style helper
if "featuredHeadLeft" not in t:
    t = t.replace(
        "  featuredHead: {",
        "  featuredHeadLeft: {\n    flexDirection: \"row\",\n    alignItems: \"center\",\n    gap: 8,\n  },\n  featuredHead: {",
    )
p.write_text(t, encoding="utf-8")
print("markets.tsx updated")

# market-detail TokenBadge
p2 = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(app)\market-detail.tsx")
t2 = p2.read_text(encoding="utf-8")
t2 = t2.replace(
    'import { MockBanner } from "@/src/components/MockBanner";',
    'import { MockBanner } from "@/src/components/MockBanner";\nimport { TokenLogo } from "@/src/components/TokenLogo";',
)
# replace local TokenBadge function if present
import re
t2 = re.sub(
    r"function TokenBadge\([\s\S]*?\n\}\n",
    "",
    t2,
    count=1,
)
t2 = t2.replace("<TokenBadge symbol={symbol} size={36} />", "<TokenLogo symbol={symbol} size={40} />")
p2.write_text(t2, encoding="utf-8")
print("market-detail.tsx updated")

# perpl ticket — could add logos to strip later
print("done")
