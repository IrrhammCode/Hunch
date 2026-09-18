from pathlib import Path

root = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile")

replacements = [
    (
        '<Text style={styles.refreshIcon}>⟳</Text>\n            <Text style={styles.latencyBadgeText}>1s LATENCY</Text>',
        '<Icon name="refresh" size={14} color={colors.muted} />\n            <Text style={styles.latencyBadgeText}>REFRESH</Text>',
    ),
    ('<Text style={styles.searchIcon}>🔍</Text>', '<Icon name="search" size={18} color={colors.muted} />'),
    ("Search pairs (MON, BTC, ETH, AUSD)...", "Search MON, BTC, ETH, SOL…"),
    (
        '              ALL MARKETS\n            </Text>\n            {filter === "all" ? <View style={styles.activePillDot} /> : null}',
        '              ALL\n            </Text>',
    ),
    ("              ⚡ 60S BLITZ\n            </Text>", "              60S BLITZ\n            </Text>"),
    ("              📈 PERPS 20X\n            </Text>", "              PERPS 20X\n            </Text>"),
    (
        'const iconGlyph = isMon ? "M" : isBtc ? "₿" : isEth ? "Ξ" : isSol ? "◎" : symbol.charAt(0);',
        'const isEth = m.symbol === "ETH";\n              const iconGlyph = isMon ? "M" : isBtc ? "₿" : isEth ? "Ξ" : isSol ? "◎" : (m.symbol || "•").charAt(0);',
    ),
    (">⚡ 60S</Text>", ">60S</Text>"),
    ("📈 PERPETUALS", "PERPETUALS"),
    ("⚡ 60s UP/DOWN", "60s UP/DOWN"),
    ('<Text style={styles.boltIcon}>⚡</Text>', '<Icon name="flash" size={14} color={colors.brand} />'),
    ('<Text style={styles.checkIcon}>✔</Text>', '<Icon name="checkmark-circle" size={16} color={colors.up} />'),
    ('<Text style={styles.filterChipIcon}>📈</Text>', '<Icon name="trending-up" size={13} color={colors.brand} />'),
    ("⚙ FILTER", "FILTER"),
    ('<Text style={styles.claimBtnBolt}>⚡</Text>', '<Icon name="flash" size={14} color="#0A0B0D" />'),
    ('<Text style={styles.gearIcon}>⚙</Text>', '<Icon name="settings-outline" size={20} color={colors.muted} />'),
    ('<Text style={styles.avatarIcon}>👤</Text>', '<Icon name="person-circle" size={48} color={colors.brand} />'),
    ('<Text style={styles.shieldIcon}>🛡</Text>', '<Icon name="shield-checkmark-outline" size={16} color={colors.brand} />'),
    ('<Text style={styles.copyIcon}>📋</Text>', '<Icon name="copy-outline" size={16} color={colors.muted} />'),
    ('<Text style={styles.faucetSparkIcon}>❇</Text>', '<Icon name="sparkles-outline" size={14} color={colors.brand} />'),
    ('<Text style={styles.faucetBtnIcon}>🚰</Text>', '<Icon name="water-outline" size={18} color="#0A0B0D" />'),
    ("5 Wins 🔥", "5 Wins"),
    ("⚡ SUB-SECOND", "SUB-SECOND"),
    ('<Text style={styles.boltActionIcon}>⚡</Text>', '<Icon name="flash" size={16} color={colors.brand} />'),
]

files = [
    root / "app/(app)/markets.tsx",
    root / "app/(app)/index.tsx",
    root / "app/(app)/positions.tsx",
    root / "app/(app)/profile.tsx",
    root / "src/perpl/PerpTradingTicket.tsx",
]

for f in files:
    t = f.read_text(encoding="utf-8")
    orig = t
    for a, b in replacements:
        if a in t:
            t = t.replace(a, b)
    if "components/Icon" not in t:
        needle = 'from "@/src/components/Screen"'
        if needle in t:
            t = t.replace(
                needle,
                needle + '\nimport { Icon } from "@/src/components/Icon"',
                1,
            )
        elif 'from "@/src/theme"' in t:
            lines = t.splitlines(True)
            for i, l in enumerate(lines):
                if 'from "@/src/theme"' in l:
                    lines.insert(i, 'import { Icon } from "@/src/components/Icon";\n')
                    break
            t = "".join(lines)
    if t != orig:
        f.write_text(t, encoding="utf-8")
        print("updated", f.relative_to(root))
    else:
        print("no change", f.relative_to(root))
