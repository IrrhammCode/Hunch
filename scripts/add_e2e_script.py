from pathlib import Path
import json
p = Path(r"C:\Users\Irham\Documents\code\metropolis\package.json")
t = p.read_text(encoding="utf-8")
if "e2e:smoke" not in t:
    t = t.replace('"doctor":', '"e2e:smoke": "ts-node scripts/e2eSmoke.ts",\n    "doctor":')
    p.write_text(t, encoding="utf-8")
    print("script added")
else:
    print("script exists")
