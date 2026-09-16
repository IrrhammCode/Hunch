# Hunch

60-second UP/DOWN hunches on Monad.

**Track 01** · Agora Mobile · Privy

## Architecture

```
iOS Expo (`mobile/`) — Privy session keys
    ↓
API  :8787  ← quote, calldata, positions
    ↓
Indexer (events → data/index.json)  ·  Envio scaffold in /envio
Keeper (open → resolve → claim residual → open)
    ↓
HunchVault (LP) → HunchFactory → HunchMarket  +  Pyth + AUSD
```

## Mobile

```bash
cd mobile && npm install && npx expo start
```

Tabs: **HUNCH** (live round) · **BOOK** (positions) · **YOU** (profile). Auth: login/signup under `mobile/app/(auth)`.

## Contracts

| Contract | Role |
|---|---|
| `HunchFactory` | Spawn 60s rounds |
| `HunchMarket` | CPMM YES/NO, delayed fills, resolve, redeem, `claimResidual` |
| `HunchVault` | LP deposit/withdraw, seed rounds, reclaim residual |
| `MockAUSD` | Testnet collateral (Agora AUSD on mainnet) |

## Local

```bash
npm install
npm test
npm run simulate
```

## Monad testnet

```bash
cp .env.example .env   # PRIVATE_KEY + PYTH_API_KEY

npm run deploy:vault   # Factory + Vault + fund LP
npm run keeper         # auto open/resolve loop
npm run indexer        # event sync
npm run api            # http://localhost:8787
```

### API

| Method | Path |
|---|---|
| GET | `/v1/config` |
| GET | `/v1/round/current` |
| GET | `/v1/rounds` |
| GET | `/v1/position/:address` |
| POST | `/v1/quote` `{ side, amountAUSD }` |
| POST | `/v1/tx/commit` → approve + commitBuy calldata (UserOp) |
| POST | `/v1/tx/execute` |
| POST | `/v1/tx/redeem` |

### Manual scripts

```bash
npm run trade:yes
npm run resolve:monad
```

## Addresses

See `deployments/monad-testnet.json` after deploy.
