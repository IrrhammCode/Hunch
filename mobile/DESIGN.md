# Hunch — Design mode (mock data)

For **UI / design work only**. No backend, no Privy, no Monad RPC.

You get full fake data on every screen:
- Live 60s countdown round (auto-resets)
- Balance AUSD / MON
- BOOK positions: OPEN · WON (claimable) · LOST
- Swipe / tap UP·DOWN updates mock balances + positions
- Claim + faucet work in-memory
- Auto-logged in as `designer@hunch.app`

Badge **DESIGN · MOCK DATA** shows at the top so you know you’re in mock mode.

---

## Requirements

- Node.js 20+ (18+ usually OK)
- npm
- Browser (Chrome / Edge / Firefox) **recommended**
- Optional: Android phone + Expo Go (gestures feel better; some native modules may differ)

**You do NOT need:** API, keeper, Privy keys, `.env` secrets, MetaMask.

---

## Quick start (browser — best for design)

From the repo:

```bash
cd mobile
npm install
```

Windows PowerShell:

```powershell
copy .env.design .env
npm run design
```

Mac / Linux:

```bash
cp .env.design .env
npm run design
```

Then:
1. Wait for Metro
2. Press **`w`** for web **or** open the URL Expo prints (usually `http://localhost:8081`)
3. App should land on **HUNCH** already logged in (no login form)

Phone-sized preview in Chrome: `F12` → device toolbar → iPhone / Pixel.

---

## Android (optional)

Same `.env.design` → `.env`, then:

```bash
cd mobile
npm run design:android
```

Scan the QR with **Expo Go**, or press `a` if an emulator is running.

> Design mode avoids Privy native modules. If Expo Go still complains about an unrelated native module, use **browser** instead — that’s the intended design path.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run design` | Start Expo with design intent (web-friendly) |
| `npm run design:web` | Force web |
| `npm run design:android` | Start + open Android |
| `npm start` | Normal Expo (uses whatever is in `.env`) |

---

## What’s mocked

| Screen | Mock content |
|---|---|
| **HUNCH** | Open round, strike, countdown, spot, quote, swipe trade |
| **BOOK** | Mix of open / won+claim / lost rows; claim updates AUSD |
| **YOU** | Designer profile, balances, faucet (capped like real demo) |
| Auth | Auto-login — logout re-seeds designer session |

Round timer: **60 seconds**, then a new round id. Open positions on the expired round resolve so you can test WON/LOST UI.

---

## Brand tokens (keep consistent)

File: `src/theme.ts`

| Token | Value |
|---|---|
| Background | `#0A0B0D` |
| Elevated | `#12141A` |
| Ink | `#F2F1EC` |
| Brand (lime) | `#D6FF3F` |
| UP | `#2EE59D` |
| DOWN | `#FF4D6A` |
| Fonts | Bebas Neue (display) · DM Sans (UI) |

Hard rules from product:
- No purple gradients
- No floating circle/orb decorations
- HUNCH tab = one composition (swipe card is the hero)

---

## Files you’ll usually touch

```
mobile/
  app/(app)/index.tsx      ← HUNCH play
  app/(app)/positions.tsx  ← BOOK
  app/(app)/profile.tsx    ← YOU
  app/(auth)/login.tsx     ← only if designing auth (auto-skipped in design mode)
  src/theme.ts
  src/components/ui.tsx
  src/components/BrandMark.tsx
  src/components/Screen.tsx
```

Mock data lives in `src/mock/api.ts` — edit fixtures there if you need different balances / more rows.

---

## Switch back to real app (for Irham)

```bash
cd mobile
copy .env.example .env
# fill Privy + API URL — see PRIVY_SETUP.md at repo root
npm run start:dev
```

Make sure `EXPO_PUBLIC_DESIGN_MODE` is **not** set to `1`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Still asks for Privy / API offline | Confirm `.env` has `EXPO_PUBLIC_DESIGN_MODE=1`, restart Metro (`Ctrl+C` then `npm run design`) |
| Blank web page | Hard refresh; try `npx expo start --web -c` |
| Login screen instead of HUNCH | Design mode not on — re-copy `.env.design` |
| Want empty BOOK | Edit `src/mock/api.ts` → set `positions: []` |
| Port busy | `npx expo start --web --port 8082` |

---

## Git hygiene

- Do **not** commit your personal `mobile/.env`
- `.env.design` is safe to commit (no secrets)
- Prefer a branch like `design/ui-pass` for visual PRs

---

## Product one-liner (for copy in UI)

**Swipe UP or DOWN. 60-second markets on Monad.**

Repo: https://github.com/IrrhammCode/Hunch
