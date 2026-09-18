from pathlib import Path
import re

p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\src\api\client.ts")
t = p.read_text(encoding="utf-8")
pattern = r"export async function fetchPerplMarkets\(\): Promise<\{ markets: PerplMarket\[\]; context: any \}> \{[\s\S]*?\n\}\n\nexport async function fetchPerplAccount"
old = re.search(pattern, t)
if not old:
    raise SystemExit("block not found")
replacement = (
    "export async function fetchPerplMarkets(): Promise<{ markets: PerplMarket[]; context: any }> {\n"
    "  return get<{ markets: PerplMarket[]; context: any }>(`/v1/perpl/markets`);\n"
    "}\n\n"
    "export async function fetchPerplAccount"
)
t = t.replace(old.group(0), replacement)
p.write_text(t, encoding="utf-8")
print("ok")
