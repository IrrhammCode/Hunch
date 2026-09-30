from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\SUBMISSION_FORM.md")
t = p.read_text(encoding="utf-8")
t = t.replace(
    "## Stack verified (live)",
    """## E2E smoke (live, npm run e2e:smoke)

| Check | Result |
|---|---|
| Quicknode + Perpl trade keys | PASS |
| Price BTC/ETH + history | PASS |
| Markets board BTC,ETH,SOL | PASS |
| Perpl markets n=8 | PASS |
| Perpl account 643/644 + risk | PASS |
| Wallet AUSD 9900 | PASS |
| Chain block / MON | PASS (MON low ~0.02) |
| Perpl IOC order | PASS (WS code 0, account 643) |

## Stack verified (live)""",
)
p.write_text(t, encoding="utf-8")
print("submission updated")
