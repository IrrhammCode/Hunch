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

1. **Mobile:** 
   - Tap **PERPETUALS** → select BTC → toggle **TP / SL Guard** (presets `+25%` / `-10%`) → **OPEN LONG BTC**.
   - Tap **60s UP/DOWN** → toggle **⚡ HEDGE ON PERPL** (50%) → swipe UP (atomic delta hedge).
   - In **PORTFOLIO** → interact with **Liquidation Health Gauge** and tap shock chips (`[-10%]`, `[+10%]`) to run the **Scenario Shock Simulator**.
   - Test **1-Tap Reverse** & **1-Tap Close** with zero slippage.
   - Tap **↗ SHARE** for the viral Cyberpunk PnL Share Card.
2. **Terminal Automation CLI (`scripts/perplBot.ts`):**
   - `npm run perpl:bot status` — Live portfolio & risk metrics
   - `npm run perpl:bot once BTC LONG 10 10 88000 80000` — Place IOC order with automated TP/SL guards
   - `npm run perpl:bot reverse <posId>` — 1-tap reverse position
   - `npm run perpl:bot close <posId>` — 1-tap close position
   - `npm run perpl:bot hedge demo-round UP 20 0.5` — Execute cross-product delta hedge
   - `npm run perpl:bot stress` — Multi-scenario portfolio shock test
3. **Master Verification Suite:**
   - `npm run test:master` — 22/22 live checks covering all Perpl endpoints, WS orders, keepers, and risk math!

### Why this is “production-ready”

- **Auth:** Ed25519 request signatures + one-shot nonces (not cookies/tokens in the client)  
- **Account:** on-chain `createAccount` required; API 404 until linked  
- **Risk gate:** bot refuses new orders when `HIGH` risk or free margin insufficient  
- **Keeper automation:** TP/SL Guard keeper monitors mark prices offchain and triggers market close IOC  
- **No silent paper trades:** missing keys / missing account **throw** with a clear error  

---

## 2) Best Analytics / Risk Tool ($3,000)

**Claim:** Real-time **portfolio risk, liquidation analytics & stress-testing engine** for Perpl accounts on Monad testnet.

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
| **Portfolio Stress Test** | Simulated $\pm 5\%, \pm 10\%, \pm 20\%$ market shocks with projected margin utilization & liquidation survival flags |
| **Max Survivable Move** | Exact % adverse move before account liquidation |

### Surfaces

- **Mobile PORTFOLIO:**
  - Interactive **Liquidation Health Gauge** with multi-segment track (Safe / Moderate / Danger).
  - Built-in **Scenario Shock Simulator** with 1-tap shock testing (`[-10%]`, `[-5%]`, `[+5%]`, `[+10%]`).
  - Viral **PnL Share Modal** with watermark verification.
  - In-App **Margin Manager** (`+ MARGIN`) for direct deposit/withdraw.
- **API:**
  - `GET /v1/perpl/risk/:address` — Full JSON risk report.
  - `GET /v1/perpl/risk/:address/stress-test` — Institutional-grade multi-scenario stress test.
- **CLI:**
  - `npm run perpl:bot status` — Live risk inspection.
  - `npm run perpl:bot stress` — Formatted ASCII stress test matrix.

---

## Addresses (Monad testnet 10143)

| | |
|---|---|
| Perpl Exchange | `0x1964C32f0bE608E7D29302AFF5E61268E72080cc` |
| Collateral AUSD | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` |
| Hunch API | `POST /v1/perpl/order` · `GET /v1/perpl/risk/:address` |

Repo: https://github.com/IrrhammCode/Hunch
