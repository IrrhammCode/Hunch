# OPS — day-of mentor / operator checklist

Short runbook so the demo does not brick mid-pitch.

Repo: https://github.com/IrrhammCode/Hunch  
Judge path: [mobile/DEMO.md](mobile/DEMO.md)  
Setup: [PRIVY_SETUP.md](./PRIVY_SETUP.md) · [EAS_SETUP.md](./EAS_SETUP.md) · **[PERKS.md](./PERKS.md)** (Quicknode / Tenderly / Zerion)

---

## Setup order (do once, then daily)

1. **Perks** — [PERKS.md](./PERKS.md) → Quicknode RPC + Tenderly + Zerion keys in root `.env`
2. **Privy** — [PRIVY_SETUP.md](./PRIVY_SETUP.md) → App ID + Client ID in `mobile/.env`
3. **EAS / device** — [EAS_SETUP.md](./EAS_SETUP.md) → install dev client on iPhone
4. **Backend** — root `.env` · `npm run api` + `npm run keeper`
5. **Preflight** — `npm run doctor` (must not fail on Privy / PRIVATE_KEY)
6. **Smoke** — `npm run smoke:demo`
7. **Judge path** — [mobile/DEMO.md](./mobile/DEMO.md)

---

## Before demo (15 min)

### Backend

- [ ] Root `.env` set: `PRIVATE_KEY` (has **MON** gas) + `PYTH_API_KEY` + `MONAD_RPC_URL`
- [ ] Vault funded (AUSD seed) — `npm run deploy:vault` if this is a fresh machine
- [ ] `npm run api` listening on **:8787**
- [ ] `npm run keeper` opening + resolving rounds
- [ ] `npm run doctor` — no ❌ on PRIVATE_KEY / Privy IDs
- [ ] Smoke: `curl -s localhost:8787/health` → `{"ok":true}`
- [ ] Full smoke: `npm run smoke:demo` → all **PASS** (health, config vs deployments, current round)

### Mobile

- [ ] `mobile/.env`:
  - [ ] `EXPO_PUBLIC_PRIVY_APP_ID` set
  - [ ] `EXPO_PUBLIC_PRIVY_CLIENT_ID` set
  - [ ] `EXPO_PUBLIC_USE_DEMO_AUTH` **unset** (real Privy)
  - [ ] `EXPO_PUBLIC_API_URL` = LAN IP **or** public tunnel
- [ ] iOS **dev client** or TestFlight build installed (not Expo Go)
- [ ] Phone and API host on same Wi‑Fi **or** tunnel URL baked into the build

### Reachability (off-LAN judges)

```bash
# while API runs
ngrok http 8787
# set EXPO_PUBLIC_API_URL=https://xxxx.ngrok-free.app
# restart Metro / rebuild EAS preview with that URL
```

Windows firewall: allow inbound TCP **8787** on Private if using LAN.

### Dry-run (mandatory)

- [ ] Email OTP login
- [ ] YOU shows **Privy wallet** + `0x…`
- [ ] Fund wallet (first time mints; second may be already funded / 429 — expected)
- [ ] Swipe UP or DOWN while round is open
- [ ] BOOK Claim → **View on MonadVision** opens

---

## If something fails

| Symptom | Fix |
|---|---|
| No live round | Keeper down or RPC rate-limited — restart `npm run keeper`, check logs |
| “Privy not configured” | App ID / Client ID missing → fix `mobile/.env`, restart Metro **or** rebuild |
| OTP email not arriving | Privy dashboard email login enabled? Check spam; retry send |
| API offline | Wrong IP / firewall / tunnel down — verify `curl` from phone Safari |
| Faucet 429 | Cooldown (1 / address / 10 min) — expected; wait or use another email |
| Faucet failed (not 429) | Server `PRIVATE_KEY` empty or no MON — fund key, retry |
| Trade failed | Round too close to expiry — wait for next; check execute rate limit |
| Claim fails | Round not resolved yet or already redeemed — wait / check BOOK |
| Expo Go crash | Install **dev client** build |
| Execute 429 | One execute in flight or 4 / trader / min — wait a few seconds |

---

## Demo safety (remember)

- Faucet: max **1000 AUSD** / req, MON **0.05** if below **0.02**, 1 / addr / 10 min
- Execute: 4 / trader / min, 12 / IP / min, market must be a recent factory round
- Limits are **in-memory** (API restart clears them)

---

## Day-of order of operations

1. Start API + keeper on the demo laptop  
2. Open tunnel if needed; confirm phone hits API  
3. Confirm Privy keys in the **build** the phone is running (env is baked at bundle time)  
4. Dry-run once  
5. Hand phone to judge with [mobile/DEMO.md](mobile/DEMO.md) open  

Do **not** commit `.env` or paste secrets into chat/screenshots.
