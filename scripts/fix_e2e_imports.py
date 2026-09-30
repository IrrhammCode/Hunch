from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\scripts\e2eSmoke.ts")
t = p.read_text(encoding="utf-8")
t = t.replace(
    'import { listPerplMarkets, getUserPerplAccount, buildPerplRisk } from "../src/api/perpl";\nimport { buildPerplRisk as risk } from "../src/api/perplRisk";',
    'import { listPerplMarkets, getUserPerplAccount } from "../src/api/perpl";\nimport { buildPerplRisk as risk } from "../src/api/perplRisk";',
)
p.write_text(t, encoding="utf-8")
print("imports fixed")
