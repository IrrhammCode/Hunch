# Hunch mobile (Expo)

Swipe UP or DOWN on 60-second onchain markets on Monad.

**Track 01 · Agora Mobile · Privy · Pyth** · Bundle ID `com.hunch123.app`

## Real auth only

Mera passkey (Agora) or Privy OTP. **No demo/mock login.** No `/v1/demo/*` endpoints.

| Env | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | yes | LAN IP or ngrok — not localhost |
| `EXPO_PUBLIC_MERA_RP_ID` | yes | default `accounts.hunch.app` · see `MERA_SETUP.md` |
| `EXPO_PUBLIC_PRIVY_APP_ID` | Track 01 path | see `PRIVY_SETUP.md` |
| `EXPO_PUBLIC_PRIVY_CLIENT_ID` | Track 01 path | `client-…`, not bundle id |
| `EXPO_PUBLIC_MONAD_RPC_URL` | optional | Quicknode if claimed |

`EXPO_PUBLIC_USE_DEMO_AUTH` / design-mode flags are **removed**.

Privy + Mera require a **custom development client** (or TestFlight/ad-hoc). **Expo Go will not work** for passkeys or Privy.

---

## Privy dashboard setup (once — Track 01 path)

1. Open [https://dashboard.privy.io](https://dashboard.privy.io) → create an app named **Hunch**.
2. **Login methods** → enable **Email** (OTP).
3. **Embedded wallets** → enable **Ethereum** → *create on login*.
4. **App Clients** → **New client** → iOS → bundle ID `com.hunch123.app` → copy **Client ID**.
5. (Optional) Android client with package `com.hunch123.app`.

You need:
- **App ID** (dashboard home)
- **Client ID** (App Clients list)

---

## Env

```bash
cd mobile
cp .env.example .env
```

Edit `mobile/.env` (never commit it):

| Key | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | yes | Phone → API. LAN `http://<PC_IP>:8787` or public tunnel |
| `EXPO_PUBLIC_MERA_RP_ID` | Agora path | default `accounts.hunch.app` |
| `EXPO_PUBLIC_PRIVY_APP_ID` | Track 01 path | From Privy dashboard |
| `EXPO_PUBLIC_PRIVY_CLIENT_ID` | Track 01 path | Mobile App Client ID |
| `EXPO_PUBLIC_MONAD_RPC_URL` | no | Default `https://testnet-rpc.monad.xyz` |

Find your PC LAN IP:

```powershell
# Windows
ipconfig | findstr IPv4
```

**Restart Metro** after changing `.env` (`EXPO_PUBLIC_*` is baked at bundle time).

---

## Backend (required for live rounds)

From repo root, keep these running:

```bash
cp .env.example .env   # PRIVATE_KEY + PYTH_API_KEY
npm install
npm run api            # :8787
npm run keeper         # opens + resolves 60s rounds
```

Without the keeper, HUNCH shows “waiting / no live round”.

---

## Run on a physical iPhone (dev client)

### One-time: build a development client

```bash
# requires: npm i -g eas-cli && eas login  (Expo account)
cd mobile
npm run eas:dev
# → download the build from the Expo link / install on device
```

Local native build alternative (Mac + Xcode):

```bash
cd mobile
npx expo run:ios
```

### Day-to-day

```bash
cd mobile
npm run start:dev
# press i / scan QR from the dev client
```

---

## Privy verify on device

Use this checklist after a clean install:

1. `mobile/.env` has Mera rpId + (optional) Privy App ID + Client ID filled.
2. Root `npm run api` + `npm run keeper` are running.
3. Build is a **dev client** (not Expo Go).
4. Cold open → splash → **Login** with your email → **Send code**.
5. Enter OTP → lands on **HUNCH**.
6. Open **YOU**: address is a real `0x…` from Mera passkey or Privy.
7. Login with **Mera passkey** (Agora) or Privy OTP, then tap **Fund wallet** (Agora AUSD faucet + MON).
8. On **HUNCH** (round open, ≥12s left): swipe or tap UP/DOWN.
9. Toast shows filled; **BOOK** shows OPEN position.
10. After resolve → **Claim** → toast success; explorer link works.

If YOU shows the setup box instead of login, env vars did not load — fix `.env` and restart Metro.

**Real path only:** Mera passkey or Privy. No demo auth, no `/v1/demo/*`, no mock balances.

---

## iOS build (Privy requires dev client)

```bash
npm i -g eas-cli
eas login
cd mobile
# first time only:
eas build:configure

# Development client (internal distribution)
npm run eas:dev

# TestFlight / ad-hoc preview binary
npm run eas:preview
# then:
eas submit --platform ios --profile preview   # needs Apple Developer + App Store Connect
```

### What you must do yourself

| Item | Who |
|---|---|
| Expo account (`eas login`) | you |
| Apple Developer Program (TestFlight) | you |
| Register device UDID for internal builds | EAS prompts / `eas device:create` |
| Privy App ID + Client ID | Privy dashboard |
| App Store Connect App ID for `submit` | Apple |

EAS injects `EXPO_PUBLIC_*` from `eas.json` `build.<profile>.env` at build time. Put public demo URLs in **preview**, LAN IP in **development**.

### Android (secondary)

```bash
npm run eas:dev:android      # APK dev client
npm run eas:preview:android  # shareable APK
```

---

## API reachability

| Setup | `EXPO_PUBLIC_API_URL` |
|---|---|
| Same Wi‑Fi as PC | `http://<PC_LAN_IP>:8787` |
| Judges off-LAN | `https://<ngrok-or-vps>` tunnel → `:8787` |

Windows firewall: allow inbound TCP **8787** on private networks, or use a tunnel:

```bash
# from repo root, while API runs
ngrok http 8787
# set mobile/.env EXPO_PUBLIC_API_URL=https://xxxx.ngrok-free.app
```

---

## Tabs

| Tab | Job |
|---|---|
| **HUNCH** | Live 60s round · swipe UP/DOWN |
| **BOOK** | Positions + claim |
| **YOU** | Wallet, faucet, sign out |

---

## Judge path (5 minutes)

See [DEMO.md](./DEMO.md).
