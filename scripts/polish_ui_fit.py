from pathlib import Path

root = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile")

# --- markets.tsx ---
p = root / "app/(app)/markets.tsx"
t = p.read_text(encoding="utf-8")

t = t.replace(
    """          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search MON, BTC, ETH, SOL…"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          <View style={styles.cmdKBadge}>
            <Text style={styles.cmdKText}>CMD+K</Text>
          </View>
        </View>""",
    """          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search markets"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoCapitalize="characters"
            clearButtonMode="while-editing"
          />
        </View>""",
)

t = t.replace("PAIRS & LEVERAGE", "MARKET")
t = t.replace("24H TREND", "TREND")
t = t.replace("PRICE / 24H", "PRICE")

t = t.replace(
    """                      <Text style={styles.volSub}>
                        Vol ${(m.volume24hAUSD / 1000).toFixed(0)}k • +{(m.fundingRateBps / 1000).toFixed(3)}%
                      </Text>""",
    """                      <Text style={styles.volSub} numberOfLines={1}>
                        Vol ${(m.volume24hAUSD / 1000).toFixed(0)}k · 20x max
                      </Text>""",
)

t = t.replace(
    """                    <Text style={styles.volSub}>Round #1420 • 25.4k Pool</Text>""",
    """                    <Text style={styles.volSub} numberOfLines={1}>60s UP/DOWN · live</Text>""",
)

t = t.replace(
    """          <View style={styles.oracleFooter}>
            <View style={styles.oracleLeft}>
              <View style={styles.greenDot} />
              <Text style={styles.oracleText}>Pyth Oracle Engine: 12ms feed</Text>
            </View>
            <Text style={styles.epochText}>Epoch #884920</Text>
          </View>""",
    """          <View style={styles.oracleFooter}>
            <View style={styles.oracleLeft}>
              <View style={styles.greenDot} />
              <Text style={styles.oracleText}>Pyth · Monad testnet</Text>
            </View>
          </View>""",
)

t = t.replace('style={styles.searchIcon}', 'style={styles.searchIcon}')
# header spacing
t = t.replace(
    "paddingHorizontal: 16,\n    backgroundColor: \"#0A0B0D\",",
    "paddingHorizontal: 18,\n    backgroundColor: \"#0A0B0D\",",
)

if "cmdKBadge" not in t:
    pass

# ellipsize pair titles
t = t.replace(
    "<Text style={styles.pairTitle}>{m.symbol}</Text>",
    '<Text style={styles.pairTitle} numberOfLines={1}>{m.symbol}</Text>',
)
t = t.replace(
    "<Text style={styles.priceNum}>",
    '<Text style={styles.priceNum} numberOfLines={1}>',
)

p.write_text(t, encoding="utf-8")
print("markets ok")

# --- index.tsx (trade copy + fake chrome) ---
p = root / "app/(app)/index.tsx"
t = p.read_text(encoding="utf-8")

t = t.replace('import { Screen } from "@/src/components/Screen"\n', 'import { Screen } from "@/src/components/Screen";\n')

replacements = [
    ("← SWIPE DOWN (BEAR)", "← DOWN"),
    ("SWIPE UP (BULL) →", "UP →"),
    (
        "MONAD HUB R#{round?.roundId || \"1,842\"} • PYTH ORACLE",
        "Monad · R#{round?.roundId || \"—\"} · Pyth",
    ),
    ("EST. EXPIRY", "SECONDS LEFT"),
    (
        "LOCKS IN {Math.max(0, (remainingSecRaw - 1.2)).toFixed(1)}s",
        "OPEN",
    ),
    ("STRIKE BENCHMARK", "STRIKE"),
    (
        "${strikeLabel ? (Number(strikeLabel.replace(\",\", \"\")) + 64.5).toLocaleString(undefined, { minimumFractionDigits: 2 }) : \"$78,214.50\"}{\" \"}\n                      <Text style={styles.livePriceDelta}>+$64.50</Text>",
        "${strikeLabel}",
    ),
    ("LIVE PRICE", "LIVE"),
    ("UP (YES) 54¢ • 1.85x", "UP"),
    ("2.17x • 46¢ DOWN (NO)", "DOWN"),
    ("58% Pool Volume ($18.50)", "Pool volume"),
    ("42% Pool Volume ($21.70)", ""),
    ("← DRAG LEFT (BEAR) / RIGHT (BULL) →", "Swipe card · or tap below"),
    (
        "Stake {amount}.00 AUSD • Sub-second Finality (<40ms) • Zero Gas Fees",
        "{amount} AUSD · settled on Monad via Pyth",
    ),
    (
        "Pays 2.17x (${(Number(amount) * 2.17).toFixed(2)})",
        "DOWN · {amount} AUSD",
    ),
    (
        "Pays 1.85x (${(Number(amount) * 1.85).toFixed(2)})",
        "UP · {amount} AUSD",
    ),
    ("↓ DOWN", "DOWN"),
    ("↑ UP", "UP"),
]

for a, b in replacements:
    t = t.replace(a, b)

# Fix live price block if still present
t = t.replace(
    """                    <Text style={styles.livePriceText}>
                      ${strikeLabel}
                    </Text>""",
    """                    <Text style={styles.livePriceText} numberOfLines={1}>
                      ${strikeLabel}
                    </Text>""",
)

# Wrap hunch content for scroll on small phones
t = t.replace(
    """          <View style={{ flex: 1, justifyContent: "space-between", paddingTop: 4 }}>
            {/* Stake Amount Header */}""",
    """          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 24, gap: 14, flexGrow: 1, justifyContent: "space-between" }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Stake Amount Header */}""",
)
t = t.replace(
    """                {"" "}
                {"" "}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Screen>""",
    """              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </Screen>""",
)

# simpler footnote close - find footnote end
t = t.replace(
    """            <View style={styles.footnoteRow}>
              <Icon name="checkmark-circle" size={16} color={colors.up} />
              <Text style={styles.footnoteText}>
                {amount} AUSD · settled on Monad via Pyth
              </Text>
            </View>
          </View>
        )}""",
    """            <View style={styles.footnoteRow}>
              <Icon name="checkmark-circle" size={14} color={colors.up} />
              <Text style={styles.footnoteText} numberOfLines={2}>
                {amount} AUSD · Monad + Pyth
              </Text>
            </View>
          </ScrollView>
        )}""",
)

# fake odds use real spot when present
t = t.replace(
    """                    <Text style={styles.oddsUpLabel}>UP</Text>
                    <Text style={styles.oddsDownLabel}>DOWN</Text>""",
    """                    <Text style={styles.oddsUpLabel}>
                      UP {data?.spot ? `${(Number(data.spot.yes) * 100).toFixed(0)}¢` : "—"}
                    </Text>
                    <Text style={styles.oddsDownLabel}>
                      {data?.spot ? `${(Number(data.spot.no) * 100).toFixed(0)}¢ ` : ""}DOWN
                    </Text>""",
)

# hide EDIT chip label to shorter
t = t.replace(
    """              <View style={styles.editChip}>
                <Text style={styles.editChipText}>EDIT</Text>
              </View>""",
    """              <View style={styles.editChip}>
                <Text style={styles.editChipText}>AUSD</Text>
              </View>""",
)

if "ScrollView" not in t.split("\n")[3]:
    t = t.replace(
        'import { Dimensions, Linking, Pressable, StyleSheet, Text, View } from "react-native";',
        'import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";',
    )

p.write_text(t, encoding="utf-8")
print("index ok")

# --- profile.tsx ---
p = root / "app/(app)/profile.tsx"
t = p.read_text(encoding="utf-8")
t = t.replace(
    """        <View style={styles.topStatus}>
          <View style={styles.statusLeft}>
            <View style={styles.greenDot} />
            <Text style={styles.networkText}>MONAD TESTNET</Text>
            <Text style={styles.pipe}>|</Text>
            <Text style={styles.tpsText}>10,143 TPS</Text>
          </View>
          <View style={styles.statusRight}>
            <View style={styles.purpleDot} />
            <Text style={styles.chainText}>CHAIN: 10143</Text>
          </View>
        </View>""",
    """        <View style={styles.topStatus}>
          <View style={styles.statusLeft}>
            <View style={styles.greenDot} />
            <Text style={styles.networkText}>MONAD TESTNET</Text>
          </View>
        </View>""",
)
t = t.replace("YOU &amp; WALLET", "YOU")
t = t.replace(
    "Manage Privy smart credentials &amp; testnet assets",
    "Wallet, balances, faucet",
)
t = t.replace("<Text style={styles.userName}>irham.monad</Text>", "")
t = t.replace(
    """              <View style={styles.userTitleRow}>
                
                <View style={styles.proBadge}>
                  <Text style={styles.proText}>PRO</Text>
                </View>
              </View>
              <Text style={styles.userEmail}>@ {email}</Text>""",
    """              <Text style={styles.userName} numberOfLines={1}>
                {user?.displayName || "Trader"}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>{email}</Text>""",
)
t = t.replace(
    """            <View style={styles.onlineStatusCol}>
              <View style={styles.onlinePill}>
                <View style={styles.greenDot} />
                <Text style={styles.onlinePillText}>ONLINE</Text>
              </View>
              <Text style={styles.latencySub}>Monad Sub-40ms</Text>
            </View>""",
    """            <View style={styles.onlineStatusCol}>
              <View style={styles.onlinePill}>
                <View style={styles.greenDot} />
                <Text style={styles.onlinePillText}>{privyMode ? "PRIVY" : "DEMO"}</Text>
              </View>
            </View>""",
)
t = t.replace(
    "Self-Custodial • Monad Account Abstraction",
    "Embedded wallet · Monad testnet",
)
t = t.replace("<Text style={styles.ercBadgeText}>ERC-4337</Text>", "")
t = t.replace("TOTAL EMBEDDED PORTFOLIO", "PORTFOLIO")
t = t.replace(
    'const address = user?.address || me?.address || "0x8f2a2810C994E9a";',
    'const address = user?.address || me?.address || "";',
)
t = t.replace(
    'const email = user?.email || "irham***@privy.id";',
    'const email = user?.email || "—";',
)
t = t.replace(
    'const ausdBalance = me?.ausd ? Number(me.ausd).toFixed(2) : "3,400.00";',
    'const ausdBalance = me?.ausd ? Number(me.ausd).toFixed(2) : "—";',
)
t = t.replace(
    'const monBalance = me?.mon ? Number(me.mon).toFixed(2) : "14.50";',
    'const monBalance = me?.mon ? Number(me.mon).toFixed(2) : "—";',
)
t = t.replace(
    "const totalVal = (Number(ausdBalance.replace(\",\", \"\")) + Number(monBalance) * 3.5).toFixed(2);",
    "const totalVal = ausdBalance === \"—\" ? \"—\" : ausdBalance;",
)
t = t.replace("<Text style={styles.qrIcon}>⊞</Text>", '<Icon name="qr-code-outline" size={16} color={colors.muted} />')

p.write_text(t, encoding="utf-8")
print("profile ok")

# --- positions.tsx ---
p = root / "app/(app)/positions.tsx"
t = p.read_text(encoding="utf-8")
t = t.replace(
    'const totalCollateral = me?.ausd ? Number(me.ausd).toFixed(2) : "1,250.00";',
    'const totalCollateral = me?.ausd ? Number(me.ausd).toFixed(2) : "—";',
)
t = t.replace(
    'const marginInUse = perplAccount?.marginUsedAUSD ? perplAccount.marginUsedAUSD.toFixed(2) : "150.00";',
    'const marginInUse = perplAccount?.marginUsedAUSD != null ? perplAccount.marginUsedAUSD.toFixed(2) : "0.00";',
)
t = t.replace(
    'const unrealizedPnL = perplAccount?.unrealizedPnLAUSD ? perplAccount.unrealizedPnLAUSD.toFixed(2) : "+85.50";',
    'const unrealizedPnL = perplAccount?.unrealizedPnLAUSD != null ? perplAccount.unrealizedPnLAUSD.toFixed(2) : "0.00";',
)
t = t.replace(
    "const totalEquity = (Number(totalCollateral.replace(\",\", \"\")) + Number(marginInUse.replace(\",\", \"\"))).toFixed(2);",
    'const totalEquity = totalCollateral === "—" ? "—" : (Number(totalCollateral.replace(",", "")) + Number(marginInUse.replace(",", ""))).toFixed(2);',
)
t = t.replace(
    "`${pos.side} ${pos.symbol} closed · Realized PnL: ${pnl} AUSD`",
    "`${pos.symbol} ${pos.side} · ${pnl} AUSD`",
)

p.write_text(t, encoding="utf-8")
print("positions ok")
