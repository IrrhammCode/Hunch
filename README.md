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
npx expo start --dev-client
```

`mobile/.env`:

| Var | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Phone → API. LAN IP (`http://192.168.x.x:8787`) or public ngrok/VPS URL |
| `EXPO_PUBLIC_PRIVY_APP_ID` | Privy Dashboard → App ID |
| `EXPO_PUBLIC_PRIVY_CLIENT_ID` | Privy Dashboard → mobile App Client ID |
| `EXPO_PUBLIC_USE_DEMO_AUTH` | `1` = local demo login without Privy |

**Privy Dashboard setup:** enable **Email OTP** + **Embedded wallets (Ethereum → create on login)** + add an App Client for iOS bundle `com.hunch.app`.

> Privy needs a **development build** (`npx expo run:ios` or EAS dev client). Expo Go will not load native Privy modules.

### 3. Judges on a different network

Point `EXPO_PUBLIC_API_URL` at a public host:

```bash
# from repo root, while API runs on :8787
ngrok http 8787
# then EXPO_PUBLIC_API_URL=https://<ngrok-host>
```

Never hardcode a single machine IP as the only path — document LAN *and* public options.

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
