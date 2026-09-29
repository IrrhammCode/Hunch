# Perpl bounties — Hunch write-up

## 1) Best use of Perpl's API ($5,000)

**Claim:** Production-ready mobile trading **client + automation** that places orders on Perpl testnet through a signed API path (not UI-only mock).

### Architecture

```
Mobile (Hunch)  →  Hunch API :8787  →  Perpl REST + trading WS
                      │                      │
                      │ Ed25519 trade key    │ market IOC (OrderType)
                      │ account-link 644     │ position history
                      ▼                      ▼
              Agora AUSD collateral    Exchange 0x1964…80cc
```

| Piece | Location |
|---|---|
| Signed WS orders | `src/shared/perplAuth.ts` (`mt:29` signin, `mt:22` order) |
| Trade-scope keys | `PERPL_API_KEY` + `PERPL_API_KEY_SECRET` in root `.env` |
| On-chain account | `createAccount` + `POST /v1/perpl/account-link` (`scripts/perplAccount.ts`) |
| Mobile order path | TRADE tab / market-detail → `POST /v1/perpl/order` |
| Automation bot | `npm run perpl:bot` — risk gate + place + cycle monitor |
| Markets feed | `GET /v1/perpl/markets` (public context, always live) |

### Demo (judge)

1. Mobile: MARKETS → BTC → LONG 10 AUSD 2x  
2. Terminal: `npm run perpl:bot status` → risk + positions  
3. `npm run perpl:bot once BTC LONG 10 2` — automated IOC order  
4. PORTFOLIO → Perpl risk panel (margin, uPnL, liq distance)

### Why this is “production-ready”

- **Auth:** Ed25519 request signatures + one-shot nonces (not cookies/tokens in the client)  
- **Account:** on-chain `createAccount` required; API 404 until linked  
- **Risk gate:** bot refuses new orders when `HIGH` risk or free margin insufficient  
- **No silent paper trades:** missing keys / missing account **throw** with a clear error  

---

## 2) Best Analytics / Risk Tool ($3,000)

**Claim:** Real-time **portfolio risk + PnL intelligence** for Perpl accounts on Monad testnet.

### What the product shows

| Metric | Source |
|---|---|
| Collateral / free margin | on-chain AUSD + margin used |
| Unrealized PnL ($ + %) | entry vs mark × size, side-aware |
| Effective leverage | open notional / margin |
| Liquidation distance % | `|mark − liq| / mark` per position |
| Risk level LOW/MEDIUM/HIGH/FLAT | free-margin % + open risk |
| Warnings | high lev, liq proximity, low free margin, loss vs collateral |
| Market marks / 24h | Perpl public context |

### Surfaces

- **Mobile PORTFOLIO** → “PERPL RISK · ANALYTICS” card + per-position liq distance  
- **API** `GET /v1/perpl/risk/:address` → full JSON report  
- **CLI** `npm run perpl:bot status` → same report for operators  

### Not just raw data

Risk is **computed and labeled** (LOW/HIGH + warnings), not a dump of ticks — judges see a usable monitoring surface for a live exchange account.

---

## Addresses (Monad testnet 10143)

| | |
|---|---|
| Perpl Exchange | `0x1964C32f0bE608E7D29302AFF5E61268E72080cc` |
| Collateral AUSD | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` |
| Hunch API | `POST /v1/perpl/order` · `GET /v1/perpl/risk/:address` |

Repo: https://github.com/IrrhammCode/Hunch
