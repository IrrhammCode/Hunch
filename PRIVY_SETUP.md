# Privy setup runbook (Hunch)

Click-by-click so email OTP + embedded wallet work on a real iPhone.

**Do not commit** `mobile/.env`. Never paste App Secret into the repo (App ID + Client ID are public client identifiers; still keep them out of screenshots if you can).

---

## 1. Create the Privy app

1. Open **https://dashboard.privy.io** and sign in.
2. **Create app** (or select existing).
3. Name: **Hunch**.
4. You land on the app overview. Note the **App ID** (looks like `cm…` / `privy_…` — copy later).

## 2. Enable Email OTP login

1. Sidebar → **Authentication** (or **Login methods**).
2. Enable **Email**.
3. Mode: **One-time passcode (OTP)** — default for email.
4. Save.

Screenshots (text labels): `[Login methods] → Email → toggle ON → OTP`

## 3. Enable embedded wallets (Ethereum)

1. Sidebar → **Wallets** (or **Embedded wallets**).
2. Enable **Ethereum**.
3. Creation: **Create on login** (users-without-wallets / automatic).
4. Save.

This is why YOU tab shows a real `0x…` after OTP instead of a demo fake address.

## 4. Add an iOS app client

1. Sidebar → **App clients** (or **Clients** / **Applications**).
2. **New client** / **Add client**.
3. Platform: **iOS**.
4. **Bundle ID:** `com.hunch123.app` (must match `mobile/app.json`).
5. If asked for scheme / redirect: **`hunch`** (matches `mobile/app.json` → `scheme`).
6. Create → copy the **Client ID** (often starts with `client_`).

Optional: add Android package `com.hunch123.app` the same way.

## 5. Fill `mobile/.env` (local only)

```bash
cd mobile
cp .env.example .env   # if you don't already have .env
```

Edit `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://<YOUR_PC_LAN_IP>:8787
EXPO_PUBLIC_PRIVY_APP_ID=paste_app_id_here
EXPO_PUBLIC_PRIVY_CLIENT_ID=paste_client_id_here

# MUST be commented out or absent for judge mode:
# EXPO_PUBLIC_USE_DEMO_AUTH=1
```

Find LAN IP (Windows):

```powershell
ipconfig | findstr IPv4
```

Phone cannot use `localhost`.

## 6. Reload the app correctly

`EXPO_PUBLIC_*` is **baked into the JS bundle** at Metro start / EAS build time.

- Dev client: stop Metro → `npm run start:dev` again
- EAS binary: you must **rebuild** after changing `eas.json` env or `mobile/.env` used at build time

Privy native modules require a **dev client / EAS build** — **Expo Go will not work**.

## 7. Verify

| Step | Expected |
|---|---|
| Login screen | Email field + **Send code** (no “Privy not configured” box) |
| OTP | Email arrives; verify lands in app |
| YOU tab | Pill **Privy wallet** + short `0x…` address |
| Fund wallet | Toast success (first time mints; later may be already funded / 429) |

If you still see the red setup box: App ID / Client ID empty or Metro not restarted.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| “Privy not configured” | Empty `EXPO_PUBLIC_PRIVY_*` | Paste IDs, restart Metro |
| Expo Go / missing native module | Expo Go + Privy | Install EAS **development client** |
| OTP email not arriving | Email login off or typo | Dashboard → enable Email OTP; check spam |
| Login works, no wallet address | Embedded wallets off / create-on-login off | Enable Ethereum + create on login |
| `eth_sendTransaction` fails | Wrong chain / no MON | Faucet MON; ensure chainId **10143** |
| Client ID rejected | Bundle ID mismatch | Client must be `com.hunch123.app` |
| Works on Wi‑Fi only | `API_URL` LAN-only | Use ngrok for off-LAN judges |
| Still demo login | `EXPO_PUBLIC_USE_DEMO_AUTH=1` | Unset it and restart Metro |
| Env “not loading” | Edited `.env` without restart | Stop Metro; `npm run start:dev` |

---

## Security

- Do **not** commit `mobile/.env`
- Do **not** put Privy **App Secret** in the mobile app
- Client ID + App ID are for the client bundle; rotate in dashboard if leaked in a public demo video if you want

Next: [EAS_SETUP.md](./EAS_SETUP.md) → install build → [mobile/DEMO.md](./mobile/DEMO.md)
