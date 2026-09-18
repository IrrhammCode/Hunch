from pathlib import Path
import re

# --- client.ts: drop mock/DESIGN_MODE ---
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\src\api\client.ts")
t = p.read_text(encoding="utf-8")
t = t.replace('import { DESIGN_MODE } from "../config/chain";\nimport { mockApi } from "../mock/api";\n\n', "")
t = t.replace('import { DESIGN_MODE } from "../config/chain";\n', "")
t = t.replace('import { mockApi } from "../mock/api";\n', "")
# remove DESIGN_MODE mock branches
t = re.sub(r"[ \t]*if \(DESIGN_MODE\) return mockApi\.[^\n]+\n", "", t)
p.write_text(t, encoding="utf-8")
print("client.ts cleaned")

# --- AuthContext ---
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\src\auth\AuthContext.tsx")
t = p.read_text(encoding="utf-8")
t = t.replace('import { DESIGN_USER } from "../mock/api";\n', "")
t = t.replace(
    """import {
  DESIGN_MODE,
  HAS_PRIVY,""",
    """import {
  HAS_PRIVY,""",
)
t = t.replace(
    """  if (DESIGN_MODE || USE_DEMO_AUTH || !HAS_PRIVY) {
    return (
      <DemoAuthProvider missingConfig={!DESIGN_MODE && !HAS_PRIVY}>
        {children}
      </DemoAuthProvider>
    );
  }""",
    """  if (USE_DEMO_AUTH || !HAS_PRIVY) {
    return <DemoAuthProvider missingConfig={!HAS_PRIVY}>{children}</DemoAuthProvider>;
  }""",
)
t = t.replace(
    """        if (DESIGN_MODE) {
          // Auto-enter as designer — skip login friction for UI work
          await persist({
            id: DESIGN_USER.id,
            email: DESIGN_USER.email,
            displayName: DESIGN_USER.displayName,
            address: DESIGN_USER.address,
            privy: false,
          });
          return;
        }
        const raw = await storageGet(STORAGE_KEY);""",
    """        const raw = await storageGet(STORAGE_KEY);""",
)
# logout design stay-in branch
t = re.sub(
    r"    if \(DESIGN_MODE\) \{\n(?:.*\n)*?      return;\n    \}\n",
    "",
    t,
    count=1,
)
p.write_text(t, encoding="utf-8")
print("AuthContext cleaned")

# --- markets.tsx: no mock perps ---
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(app)\markets.tsx")
t = p.read_text(encoding="utf-8")
# replace mock fallback block with real-only list
old = re.search(
    r"  // Mock list fallbacks.*?const displayPerps: PerplMarket\[\] = perplMarkets\.length\n.*?\n        \];\n",
    t,
    re.S,
)
if old:
    t = t.replace(
        old.group(0),
        "  // Real Perpl API only — no fixture markets\n  const displayPerps: PerplMarket[] = perplMarkets;\n",
    )
t = t.replace(
    "onPress={() => openPerpTrade(displayPerps[0])}",
    "onPress={() => {\n                    if (displayPerps[0]) openPerpTrade(displayPerps[0]);\n                  }}",
)
# hero only if real market
t = t.replace(
    "{filter !== \"blitz\" && (",
    "{filter !== \"blitz\" && displayPerps.length > 0 && (",
)
# hero pair/price from live first market
t = t.replace(
    "<Text style={styles.heroPair}>MON / AUSD</Text>",
    "<Text style={styles.heroPair}>{displayPerps[0].symbol} / AUSD</Text>",
)
p.write_text(t, encoding="utf-8")
print("markets cleaned")

# --- positions.tsx: no mock positions ---
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\app\(app)\positions.tsx")
t = p.read_text(encoding="utf-8")
old = re.search(
    r"  // Fallback demo positions.*?const displayPerps: PerplPosition\[\] = perpPositions\.length\n.*?\n        },\n      \];\n",
    t,
    re.S,
)
if old:
    t = t.replace(
        old.group(0),
        "  // Real Perpl account positions only\n  const displayPerps: PerplPosition[] = perpPositions;\n",
    )
# ensure we didn't miss a shorter pattern
if "Fallback demo positions" in t:
    # try line-based removal between markers
    lines = t.splitlines(True)
    out = []
    skip = False
    for i, line in enumerate(lines):
        if "Fallback demo" in line or "Fallback demo positions" in line:
            skip = True
        if skip and "const displayPerps" in line:
            out.append("  const displayPerps: PerplPosition[] = perpPositions;\n")
            # skip until we close the array that started after displayPerps assignment
            continue
        if skip and line.strip().startswith("];"):
            skip = False
            continue
        if not skip:
            out.append(line)
    t = "".join(out)
p.write_text(t, encoding="utf-8")
print("positions cleaned")

# --- PerpTradingTicket: no mock markets ---
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\src\perpl\PerpTradingTicket.tsx")
t = p.read_text(encoding="utf-8")
old = re.search(
    r"  // Mock list fallbacks.*?const displayMarkets: PerplMarket\[\] = markets\.length\n.*?\n      \];\n",
    t,
    re.S,
)
if not old:
    old = re.search(
        r"  const displayMarkets: PerplMarket\[\] = markets\.length\n.*?\n      \];\n",
        t,
        re.S,
    )
if old:
    t = t.replace(old.group(0), "  const displayMarkets: PerplMarket[] = markets;\n")
t = t.replace("const currentPrice = activeMarket ? activeMarket.markPrice : 78240;", "const currentPrice = activeMarket ? activeMarket.markPrice : 0;")
t = t.replace(
    "return 70416;",
    "return 0;",
)
t = t.replace('me?.ausd != null ? Number(me.ausd).toFixed(2) : "1,250.00"', 'me?.ausd != null ? Number(me.ausd).toFixed(2) : "—"')
p.write_text(t, encoding="utf-8")
print("perpl cleaned")
