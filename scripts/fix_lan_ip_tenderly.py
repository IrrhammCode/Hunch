from pathlib import Path

# Fix mobile/.env — correct LAN IP, remove Tenderly (server-only)
mobile = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\.env")
mobile.write_text("""# Hunch mobile
EXPO_PUBLIC_USE_MOCK=1
EXPO_PUBLIC_API_URL=http://192.168.100.4:8787
EXPO_PUBLIC_PRIVY_APP_ID=cmu5d79n703nn0bla6xx0220n
EXPO_PUBLIC_PRIVY_CLIENT_ID=client-WY6dnsoC1aSvve8RBfKswQCXK7mMboA9A9DE549UPFsRD
EXPO_PUBLIC_MONAD_RPC_URL=https://burned-dark-dew.monad-testnet.quiknode.pro/7395b16eed6376221df2d512d023088235eef259/
EXPO_PUBLIC_MERA_RP_ID=accounts.hunch.app
""", encoding="utf-8")

# eas.json — same IP
eas = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\eas.json")
t = eas.read_text(encoding="utf-8")
t = t.replace("http://192.168.100.3:8787", "http://192.168.100.4:8787")
eas.write_text(t, encoding="utf-8")

# Root .env — ensure Tenderly keys present
root = Path(r"C:\Users\Irham\Documents\code\metropolis\.env")
rt = root.read_text(encoding="utf-8")
if "TENDERLY_ACCESS_KEY=" not in rt:
    rt += """
TENDERLY_ACCOUNT=hammxweb3
TENDERLY_PROJECT=monad-b1b6409f0f
TENDERLY_ACCESS_KEY=-lGFm03sN616RX8BFZn-3pwlddiObYZi
"""
    root.write_text(rt, encoding="utf-8")
    print("Tenderly added to root .env")
else:
    # update if placeholder
    if "your-access" in rt or "TENDERLY_ACCESS_KEY=your" in rt:
        import re
        rt = re.sub(r"TENDERLY_ACCOUNT=.*", "TENDERLY_ACCOUNT=hammxweb3", rt)
        rt = re.sub(r"TENDERLY_PROJECT=.*", "TENDERLY_PROJECT=monad-b1b6409f0f", rt)
        rt = re.sub(r"TENDERLY_ACCESS_KEY=.*", "TENDERLY_ACCESS_KEY=-lGFm03sN616RX8BFZn-3pwlddiObYZi", rt)
        root.write_text(rt, encoding="utf-8")
        print("Tenderly placeholders replaced")
    else:
        print("Tenderly already in root .env")

print("mobile API -> 192.168.100.4")
print("eas updated" if "192.168.100.4" in t else "eas missing")
