# EAS / device setup runbook (Hunch)

Get a **development client** on a real iPhone so Privy works. Expo Go is not enough.

Repo: https://github.com/IrrhammCode/Hunch  
Prereq: [PRIVY_SETUP.md](./PRIVY_SETUP.md) for keys.

---

## Prerequisites

| Need | Why |
|---|---|
| Node + npm | Install deps |
| Expo account | `eas login` |
| Apple Developer account | Device install / TestFlight |
| Mac (optional) | `npx expo run:ios` local native build |
| `eas-cli` | EAS cloud builds |

```bash
npm i -g eas-cli
eas whoami   # or eas login
```

---

## 1. Install JS deps

```bash
cd mobile
npm install
```

---

## 2. Env **before** any build

EXPO_PUBLIC_* is inlined at **bundle / build** time.

**A. Local Metro (dev client day-to-day)** — `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://<LAN_IP>:8787
EXPO_PUBLIC_PRIVY_APP_ID=...
EXPO_PUBLIC_PRIVY_CLIENT_ID=...
# EXPO_PUBLIC_USE_DEMO_AUTH unset
```

**B. EAS cloud build** — also set the matching profile in `mobile/eas.json`:

- `build.development.env.EXPO_PUBLIC_API_URL` — LAN IP for same-Wi‑Fi demos
- `build.preview.env.EXPO_PUBLIC_API_URL` — replace **`https://YOUR_API_HOST`** with ngrok/VPS **before** `npm run eas:preview`

If you only set `mobile/.env` and never `eas.json`, a cloud build may still get the eas.json URL. Set **both** for the URL you care about.

Privy IDs: put them in `mobile/.env` for local Metro. For fully baked EAS builds that must OTP without Metro, add the same keys under `build.<profile>.env` in `eas.json` **or** use EAS secrets — do not commit real secrets if the repo is public; prefer EAS project secrets or a private override file you never push.

---

## 3. Configure the project (first time)

```bash
cd mobile
eas build:configure
```

Confirm `app.json` still has:

- `ios.bundleIdentifier`: `com.hunch123.app`
- `android.package`: `com.hunch123.app`
- `scheme`: `hunch`

---

## 4. Build a development client

```bash
# from mobile/
npm run eas:dev
# = eas build --profile development --platform ios
```

EAS will:

- Ask for Apple credentials / team if needed
- Optionally prompt to **register the device UDID** for internal distribution
- Give you a link to install the `.ipa` / install URL

Install on the iPhone (link, TestFlight-style internal install, or Apple Configurator).

Local alternative (Mac + Xcode):

```bash
cd mobile
npx expo run:ios
```

---

## 5. Run Metro against the dev client

Phone and computer on the **same Wi‑Fi**.

```bash
cd mobile
npm run start:dev
# expo start --dev-client
```

Open the **Hunch dev client** app on the phone → connect to Metro (QR / URL).

**Do not open Expo Go.**

---

## 6. Optional preview / TestFlight-shaped build

```bash
# Set preview EXPO_PUBLIC_API_URL to a public host first (ngrok/VPS)
npm run eas:preview
eas submit --platform ios --profile preview   # needs Apple + App Store Connect
```

---

## 7. Verify

1. `npm run doctor` at repo root (runbook preflight).
2. Open app → Privy OTP (not demo box).
3. YOU → **Privy wallet** + `0x…`.
4. Fund → swipe → BOOK claim.

Full path: [mobile/DEMO.md](./mobile/DEMO.md) · Day-of: [OPS.md](./OPS.md)

---

## Windows: junk `System32\npm` (Open with dialog)

If typing `npm` opens **“How do you want to open this file?”**, Windows is hitting a **0-byte** file at `C:\Windows\System32\npm` (it wins PATH over `C:\Program Files\nodejs\npm.cmd`).

**Do not** pick Word/Paint. Press **Esc** / close the dialog.

**Fix once (Admin PowerShell):**

```powershell
Remove-Item "C:\Windows\System32\npm" -Force
```

**Until you delete it**, use the repo helper (calls real npm):

```bat
scripts\win-npm.cmd run api
scripts\win-npm.cmd run keeper
scripts\win-npm.cmd run doctor
scripts\win-npm.cmd run smoke:demo
```

Or full path:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run api
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| **Expo Go** + Privy crash / missing module | Install EAS **development client** |
| `eas login` fails | `eas whoami`; re-login; check network |
| Bundle ID mismatch | Privy client + `app.json` + Apple app ID all `com.hunch123.app` |
| Build succeeds, API offline | `EXPO_PUBLIC_API_URL` wrong IP; phone not on same LAN; Windows firewall TCP **8787** |
| Cleartext HTTP blocked | LAN `http://` needs ATS local networking (already in `app.json`); prefer ngrok **https** for judges |
| Metro “No apps connected” | Dev client open? Same Wi‑Fi? Try `npx expo start --dev-client --lan` |
| Env changed, app unchanged | Restart Metro **or** rebuild EAS (env is baked) |
| Signing / credentials | Xcode team, Apple Developer paid account for device builds |
| Preview still has placeholder API | Replace `YOUR_API_HOST` in `eas.json` and rebuild |
| `USE_DEMO_AUTH` still active | Unset in `.env`, restart Metro — otherwise you never hit Privy |

---

## Command cheat sheet

```bash
# repo root
npm run doctor

# backend
npm run api
npm run keeper
npm run smoke:demo

# mobile
cd mobile
npm run start:dev
npm run eas:dev
npm run eas:preview
```
