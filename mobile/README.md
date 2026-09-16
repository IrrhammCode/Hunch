# Hunch mobile (Expo)

60s UP/DOWN hunches — Track 01 · Agora Mobile · Privy.

## IA (not a sidebar)

Mobile prediction apps (Polymarket-style / Robinhood-simple) use **bottom tabs**, not desktop sidebars:

| Tab | Job |
|---|---|
| **HUNCH** | Live round: countdown, strike, UP/DOWN |
| **BOOK** | Positions + redeem |
| **YOU** | Wallet, API, sign out |

Auth is a full-bleed brand gate (login / signup). Privy OTP + Face ID plugs into the same screens.

## Run

```bash
# from repo root — keep API + keeper running
npm run api
npm run keeper

# mobile
cd mobile
cp .env.example .env
npx expo start
```

On a physical phone, set `EXPO_PUBLIC_API_URL` to your LAN IP (e.g. `http://192.168.x.x:8787`).

## Auth note

Current login/signup is a **local demo session** so UI ships without Privy keys. Next: `@privy-io/expo` email OTP + embedded wallet + session keys for `/v1/tx/*`.
