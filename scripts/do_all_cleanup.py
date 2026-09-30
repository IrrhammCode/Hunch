from pathlib import Path
import re

# 1) Flip mock OFF
m = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\.env")
t = m.read_text(encoding="utf-8")
t = t.replace("EXPO_PUBLIC_USE_MOCK=1", "EXPO_PUBLIC_USE_MOCK=0")
m.write_text(t, encoding="utf-8")
print("mock OFF")

# 2) Rename placePrivyTrade -> placeWalletTrade (keep alias for compat)
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\src\wallet\privyTrade.ts")
t = p.read_text(encoding="utf-8")
t = t.replace("export async function placePrivyTrade(", "export async function placeWalletTrade(")
if "export const placePrivyTrade = placeWalletTrade" not in t:
    t += "\n/** @deprecated alias */\nexport const placePrivyTrade = placeWalletTrade;\n"
t = t.replace("export async function redeemPrivyPosition(", "export async function redeemWalletPosition(")
if "export const redeemPrivyPosition" not in t:
    t += "\n/** @deprecated alias */\nexport const redeemPrivyPosition = redeemWalletPosition;\n"
t = t.replace("export async function fundPrivyWallet(", "export async function fundWallet(")
if "export const fundPrivyWallet" not in t:
    t += "\n/** @deprecated alias */\nexport const fundPrivyWallet = fundWallet;\n"
p.write_text(t, encoding="utf-8")
print("privyTrade renamed")

root = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile")
for f in root.rglob("*.ts*"):
    if "node_modules" in str(f) or "privyTrade" in f.name:
        continue
    t = f.read_text(encoding="utf-8")
    o = t
    t = t.replace("placePrivyTrade", "placeWalletTrade")
    t = t.replace("redeemPrivyPosition", "redeemWalletPosition")
    t = t.replace("fundPrivyWallet", "fundWallet")
    if t != o:
        f.write_text(t, encoding="utf-8")
        print("updated", f.name)

# 3) eas preview URL
eas = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\eas.json")
t = eas.read_text(encoding="utf-8")
t = t.replace("https://YOUR_NGROK_OR_VPS_HOST", "http://192.168.100.4:8787")
t = t.replace("https://YOUR_API_HOST", "http://192.168.100.4:8787")
eas.write_text(t, encoding="utf-8")
print("eas preview updated")
