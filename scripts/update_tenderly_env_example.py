from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\.env.example")
t = p.read_text(encoding="utf-8")
old = '''# ============================================
# 2) TENDERLY — simulate txs (Metropolis perk)
# ============================================
# https://dashboard.tenderly.co → Account → Settings/Authorization → Access Keys
# Account slug = dashboard.tenderly.co/account/<SLUG>
# Project = project name in that account (e.g. hunch)
TENDERLY_ACCOUNT=your-account-slug
TENDERLY_PROJECT=hunch
TENDERLY_ACCESS_KEY=your-access-key
# Optional Tenderly Node gateway (Pro perk)
# TENDERLY_NODE_ACCESS_KEY=
'''
# try with mojibake dashes from file
import re
# normalize section by regex between markers
pat = re.compile(
    r"# 2\) TENDERLY.*?(?=\n# 3\) ZERION)",
    re.S,
)
new = """# 2) TENDERLY - simulate txs (Metropolis perk)
# ------------------------------------------------------------
# Dashboard: https://dashboard.tenderly.co
#
# Steps (UI = Access Tokens page):
#   1. Sidebar -> Projects -> note EXACT project name/slug
#      e.g. monad-b1b640...  -> TENDERLY_PROJECT
#   2. Sidebar -> Access Tokens -> Create Access Token
#      - Name: hunch-api
#      - Scope: this project (not all orgs)
#      - Copy the token NOW -> TENDERLY_ACCESS_KEY
#   3. Org / account slug from top-left or URL
#      https://dashboard.tenderly.co/account/<SLUG>/project/<PROJECT>
#      -> TENDERLY_ACCOUNT = <SLUG>
#
# Example (replace with yours):
TENDERLY_ACCOUNT=hammxweb3
TENDERLY_PROJECT=your-project-slug
TENDERLY_ACCESS_KEY=your-access-token
# Optional Tenderly Node gateway (Pro perk)
# TENDERLY_NODE_ACCESS_KEY=

"""
t2, n = pat.subn(new, t, count=1)
if n != 1:
    print("section not replaced", n)
else:
    p.write_text(t2, encoding="utf-8")
    print("Tenderly section updated")
