# Hunch

Swipe UP or DOWN on 60-second fully onchain markets, built on Monad.

**Metropolis Track 01** · Agora Mobile · Privy · Pyth · Deadline Oct 13, 2026

---

## Try in 2 minutes

1. Open the app on a phone (Expo Go is **not** enough for Privy — use a dev client).
2. Log in with **email OTP** (Privy creates an embedded Monad wallet).
3. Tap **Faucet** on YOU if balances are empty (MockAUSD + MON gas).
4. On **HUNCH**: swipe **right = UP**, **left = DOWN** (or tap the soft buttons).
5. Wait ~60s for the keeper to resolve → **BOOK** → **Claim**.

---

## Architecture

```
iOS Expo (mobile/) — Privy email OTP + embedded wallet
        ↓
API :8787  ·  quote, calldata, faucet, relayed executeBuy
        ↓
Indexer (events → data/index.json)  ·  Envio scaffold in /envio
Keeper (open → resolve → claim residual → open)
        ↓
HunchVault (LP) → HunchFactory → HunchMarket  +  Pyth + MockAUSD
```

**Trade path (Privy):**
1. Phone signs `approve` + `commitBuy` from the embedded wallet.
2. API hot-wallet waits delay-blocks, pulls Pyth, calls `executeBuy` (shares credit the trader).
3. Phone signs `redeem` after resolve.

**Demo path:** `EXPO_PUBLIC_USE_DEMO_AUTH=1` uses a shared hot wallet end-to-end (local only).

---

## Contracts (Monad testnet)

| Contract | Address | Explorer |
|---|---|---|
| Factory | `0x9b708E57B0a51d03207b0c65392D50de40e1B250` | [MonadVision](https://testnet.monadvision.com/address/0x9b708E57B0a51d03207b0c65392D50de40e1B250) |
| Vault | `0xe064D0B2edE1891ebD0F815eDADd45541c62C927` | [MonadVision](https://testnet.monadvision.com/address/0xe064D0B2edE1891ebD0F815eDADd45541c62C927) |
| MockAUSD | `0xB5C6B27f0128A317171C5658eAfAC901d52f2989` | [MonadVision](https://testnet.monadvision.com/address/0xB5C6B27f0128A317171C5658eAfAC901d52f2989) |
| Pyth | `0x2880aB155794e7179c9eE2e38200202908C17B43` | [MonadVision](https://testnet.monadvision.com/address/0x2880aB155794e7179c9eE2e38200202908C17B43) |

Chain ID **10143** · BTC/USD feed from Pyth. Source of truth: `deployments/monad-testnet.json`.

| Contract | Role |
|---|---|
| `HunchFactory` | Spawn 60s rounds |
| `HunchMarket` | CPMM YES/NO, delayed fills, resolve, redeem |
| `HunchVault` | LP deposit/withdraw, seed rounds, reclaim residual |
| `MockAUSD` | Testnet collateral (Agora AUSD on mainnet) |

---

## How to run

### 0. Root env

```bash
cp .env.example .env   # PRIVATE_KEY (testnet deployer) + PYTH_API_KEY
npm install
```

### 1. Backend (keeper + API)

```bash
npm run deploy:vault   # once — Factory + Vault + fund LP
npm run keeper         # auto open → resolve loop
npm run api            # http://localhost:8787
# optional: npm run indexer
```

### 2. Mobile

```bash
cd mobile
cp .env.example .env   # set EXPO_PUBLIC_API_URL + Privy IDs
npm install
npx expo start --dev-client   # NOT Expo Go — Privy needs native modules
```

Full mobile runbook (Privy verify, EAS, TestFlight): **[mobile/README.md](mobile/README.md)**  
5-minute judge path: **[mobile/DEMO.md](mobile/DEMO.md)**

`mobile/.env`:

| Var | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Phone → API. LAN IP (`http://192.168.x.x:8787`) or public ngrok/VPS URL |
| `EXPO_PUBLIC_PRIVY_APP_ID` | Privy Dashboard → App ID |
| `EXPO_PUBLIC_PRIVY_CLIENT_ID` | Privy Dashboard → mobile App Client ID |
| `EXPO_PUBLIC_USE_DEMO_AUTH` | `1` = local demo login without Privy |

**Privy Dashboard setup:** enable **Email OTP** + **Embedded wallets (Ethereum → create on login)** + add an App Client for iOS bundle `com.hunch.app`.

### 2b. EAS / TestFlight

```bash
npm i -g eas-cli && eas login
cd mobile
eas build:configure          # first time
npm run eas:dev              # development client (internal)
npm run eas:preview          # TestFlight / ad-hoc binary
eas submit --platform ios --profile preview
```

Profiles live in `mobile/eas.json`. You need an Expo account and (for TestFlight) an Apple Developer account. Do not commit secrets; `EXPO_PUBLIC_*` is inlined at build time from the profile env or local `.env`.

> Privy needs a **development build** (`npx expo run:ios` or EAS dev client). Expo Go will not load native Privy modules.

### 3. API reachability (LAN + public)

**Same Wi‑Fi as the PC**

```powershell
ipconfig | findstr IPv4
# set mobile/.env → EXPO_PUBLIC_API_URL=http://<that-ip>:8787
```

Windows Firewall: allow inbound TCP **8787** on Private networks (or use a tunnel).

**Judges off-LAN**

```bash
# while API runs on :8787
ngrok http 8787
# mobile/.env → EXPO_PUBLIC_API_URL=https://xxxx.ngrok-free.app
# restart Metro / rebuild EAS preview with the public URL
```

Keeper must be running or HUNCH will show no live round.

---

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/config` | chainId, contracts |
| GET | `/v1/round/current` | live round + spot |
| GET | `/v1/round/:id` | round status |
| GET | `/v1/rounds` | indexed history |
| GET | `/v1/wallet/:address` | balances + positions |
| POST | `/v1/wallet/faucet` | mint MockAUSD + top up MON |
| POST | `/v1/quote` | `{ side, amountAUSD }` |
| POST | `/v1/tx/commit` | approve + commitBuy calldata |
| POST | `/v1/trade/execute` | relay executeBuy after delay-blocks |
| POST | `/v1/tx/redeem` | redeem calldata |
| POST | `/v1/demo/trade` | demo hot-wallet trade |
| GET | `/v1/demo/me` | demo wallet snapshot |

---

## Local contracts

```bash
npm install
npm test
npm run simulate
```

---

## Demo vs production

| | Demo (hackathon) | Production |
|---|---|---|
| Collateral | MockAUSD mintable | Agora AUSD |
| Auth | Privy email OTP + embedded wallet | same + passkeys / session keys |
| Gas | Faucet MON on testnet | paymaster / gas sponsorship (ZeroDev) |
| Execute | API hot-wallet relays `executeBuy` | user or decentralized keepers |
| RPC | public Monad testnet | dedicated RPC |
| Indexer | file store + Envio scaffold | Envio full indexer |

---

## Track callouts

- **Agora Mobile** — iOS-first Expo app, AUSD collateral shape.
- **Privy** — email OTP login, embedded wallet is the trader of record.
- **Pyth** — BTC/USD strike + settlement on Monad.
- **Monad** — 60s rounds, low latency commits.

---

## Mobile tabs

**HUNCH** (play) · **BOOK** (positions / claim) · **YOU** (wallet, faucet, logout)

Auth lives under `mobile/app/(auth)`.

## Judge try path

See [mobile/DEMO.md](mobile/DEMO.md) — email OTP → fund → swipe → resolve → claim.
