from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\src\shared\perplAuth.ts")
t = p.read_text(encoding="utf-8")
old = "        const accountId = input.accountId || discoveredId;"
new = """        // Trade with the API-key's own account when discovered (key wallet != local link)
        const accountId = discoveredId || input.accountId;"""
if old not in t:
    print("pattern missing")
else:
    t = t.replace(old, new)
    p.write_text(t, encoding="utf-8")
    print("WS account fix applied")

# perpl.ts placePerplOrder - do not force wrong accountId
p2 = Path(r"C:\Users\Irham\Documents\code\metropolis\src\api\perpl.ts")
t2 = p2.read_text(encoding="utf-8")
t2 = t2.replace(
    "    accountId: params.accountId ?? getLinkedPerplAccountId(trader),",
    "    // Prefer linked id; Perpl WS will still bind to the trade-key account if different\n    accountId: params.accountId ?? getLinkedPerplAccountId(trader) ?? undefined,",
)
p2.write_text(t2, encoding="utf-8")
print("perpl order account note")
