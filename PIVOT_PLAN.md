# PIVOT_PLAN — Hunch → mobile multichain trading app (Option T)

**Status:** PLAN only — implement after you approve this file  
**Date:** 2026-09-18 · **Submit:** 2026-10-13 · **Evidence:** `research/hunch-multichain-trading/REPORT.md`

---

## 1. Decision (locked for this plan)

| Choose | **Option T — Trading app + Markets module + Monad-hub multichain board** |
|---|---|
| Not | Full cross-chain settlement super-app (Rank3) |
| Fallback | **Option S** if Rank1 is not demo-ready by **2026-10-08** |

**One-liner (new):**  
**Hunch — mobile trading on Monad. Swipe UP or DOWN on short-horizon markets.**

**Judge line (not “options”):**  
CPMM binary **event markets**, Pyth-resolved on Monad — not TradFi vanilla options.

---

## 2. Product definition

### What Hunch becomes

A **mobile trading app** whose flagship ticket is **short-horizon UP/DOWN markets** (existing 60s CPMM + delayed fills + Pyth). Multichain means **multiple markets / assets / network surfaces**, with **settlement on Monad** as the hub.

### What stays sacred

- Privy OTP + embedded wallet = trader of record  
- Phone signs `approve` + `commitBuy`; API relays `executeBuy`; user claims  
- Dark lime brand (`mobile/src/theme.ts`)  
- Faucet + rate limits + judge docs  

### What we rename (UI copy, not necessarily repo)

| Old | New |
|---|---|
| HUNCH tab (only play) | **Markets** list → tap market → **Trade** (swipe card) |
| “Options” (if anyone said this) | **Markets** / **Up-Down** / **Short-horizon** |
| BOOK | **Portfolio** (positions + history + claim) |
| YOU | **You** (wallet, faucet, network badge **Monad**) |

Repo name can stay `Hunch`. App store name: **Hunch**.

---

## 3. Information architecture (mobile)

```
Tabs (4)
├── Portfolio     balances · open/redeemable · tx history · MonadVision links
├── Markets       list: asset, countdown, odds UP/DOWN, volume/open interest (fake OK if labeled testnet)
│                 filter chips: All | BTC | ETH | SOL | MON
│                 row tap → Market detail
├── Market detail existing swipe hero (strikes, countdown, amount chips)
│                 CTA: swipe UP/DOWN · secondary: Yes/No labels with odds
└── You           identity · Privy wallet · faucet · network Monad · sign out

Auth (unchanged flow)
Login → email OTP / Apple → Portfolio
```

**First session (3 steps):** Login → Fund → Markets → swipe. Seed phrase never shown.

---

## 4. Multichain / multi-market technical plan

### Rank 1 — Ship this (low risk) — **Market board on Monad**

| Workstream | Detail |
|---|---|
| Contracts | Factory already takes `priceFeedId` per market. Deploy/add rounds for **BTC, ETH, SOL** (Pyth Hermes feed ids) on **Monad testnet 10143** only |
| Keeper | Open/resolve loop over **N parallel markets** (or sequential per feed); keep `KEEPER_POLL_MS≥8000`; reuse `rpcRetry` |
| API | `GET /v1/markets` · `GET /v1/markets/:id/round/current` · keep `/v1/trade/execute` per market |
| Mobile | Markets list + detail; trade path unchanged (Privy) |
| Collateral | MockAUSD (demo) — document Agora AUSD as production |
| “Multichain” badge | UI: **Built for multi-asset markets · settlement Monad**. Optional: show Pyth assets as “venues” — **do not** fake other L1 txs |

### Rank 2 — Optional stretch (gate **2026-10-04**)

- Same contracts on **Base Sepolia** + Privy `supportedChains` + switchChain  
- Dual keeper/API or per-chain config  
- Only if Rank1 demo + video + Privy device path are **green**  
- Else **delete** from submit copy  

### Rank 3 — Explicit non-goals for 13 Oct

- AUSD bridge, cross-chain BOOK aggregation, multichain paymaster  
- TradFi options (strikes/Greeks)  
- Full CLOB / Kuru order book (unless team already has a Kuru integration plan — default **no**)

---

## 5. Workstreams & ownership (team)

| ID | Stream | Deliverable | Depends |
|---|---|---|---|
| W1 | Multi-market contracts + deploy script | Factory seeds/opens ETH + SOL feed markets; deployments JSON | Pyth feed ids |
| W2 | Keeper multi-market | Open/resolve all active markets without RPC meltdown | W1 |
| W3 | API markets catalog | `/v1/markets`, per-market round/quote/trade execute | W1 |
| W4 | Mobile Markets + Portfolio IA | Tabs, list, detail reuses swipe, portfolio polish | W3 (or design-mode mocks) |
| W5 | Privy harden | App Client allowed id `com.hunch123.app`, OTP+Apple on device | Dashboard |
| W6 | EAS + API reachability | Dev client + ngrok/VPS URL in preview build | EAS_SETUP |
| W7 | Docs/submission | SUBMIT.md, SUBMISSION_FORM, site/ one-liner = trading app + markets | Copy freeze |
| W8 | Video | 90s path: Login → Markets → swipe multi-asset → claim | W4–W6 |
| W9 | Rank2 gate | Go/no-go Oct 4 | Rank1 green |

**Suggested split (adjust to real roster):**  
W1–W3 contracts/backend · W4 mobile · W5–W6 platform · W7–W8 docs/video · all: demo dry-run.

---

## 6. Milestone calendar

| Date | Gate |
|---|---|
| **19–22 Sep** | W1 feed ids + multi-market deploy plan · W4 Markets UI on design-mode mocks |
| **23–28 Sep** | W2–W3 multi-market keeper/API live on testnet · W4 live bind |
| **29 Sep–4 Oct** | Device Privy+EAS · dry-run multi-market · **Rank2 go/no-go** |
| **5–8 Oct** | Feature freeze Rank1 · video · docs · **S fallback decision if broken** |
| **9–12 Oct** | Judges path polish · submit form URLs |
| **13 Oct** | **Submit** hackathon.monad.xyz |

---

## 7. UI / brand blueprint (delta)

**Identity:** Product UI Designer — trading mobile app, 90% state = ** Markets list / live round **.

**Grounding:** Reuse Hunch brand (dark #0A0B0D, lime #D6FF3F, up/down). Extend IA to Portfolio · Markets · Trade · You. No purple AI look; no orb glows (already removed).

### DESIGN.md delta (brand-side)

Keep existing tokens in `mobile/src/theme.ts`. Add (when implementing):

- `type` display still BebasNeue for countdowns; body DM Sans  
- Market list row: asset symbol · countdown · odds · status pill — **no** card-in-card  
- Flagship motion: keep swipe spring + haptics on **Market detail** only  

### Structure — Markets list (artifact)

1. Header: **Markets** + network chip **Monad**  
2. Filter chips: assets  
3. Rows: `BTC-USD` · `00:42` · `UP 54¢ / DOWN 46¢` · OPEN  
4. Empty: “Keeper opening next round…”  
5. Tap → existing HUNCH swipe composition (rebadged Trade)

### Decision traces

```json
[
  {"decision": "Option T not full multichain settlement","reason":"Rise In rubrics score complete demo + ecosystem depth; 25 days; Hunch loop already works","alternatives":["P bridge super-app","S BTC-only forever"],"tradeoff":"Less ‘multichain’ theater; more shipping risk if we chase Rank2 too early"},
  {"decision": "Flagship named Markets / Up-Down not Options","reason":"Avoid Greeks/strike expectations and binary-options regulatory baggage in judge eyes","alternatives":["Options tab","Predict only"],"tradeoff":"Less ‘finance options’ buzzword"},
  {"decision": "Settlement hub = Monad only for submit","reason":"Track 01 + Agora bounty are Monad-centric; Privy/AUSD bridges not demo-ready","alternatives":["Base Sepolia dual","multi-L1"],"tradeoff":"‘Multichain’ is multi-asset + architecture story unless Rank2 ships"},
  {"decision": "Swipe card remains signature trade moment","reason":"Already polished; matches Agora mobile trading UX expectation","alternatives":["order book UI"],"tradeoff":"Not a full exchange; must say so in docs"},
  {"decision": "S fallback date 2026-10-08","reason":"Video+EAS+submit need buffer after feature freeze","alternatives":["freeze 13 Oct"],"tradeoff":"Must cut Rank2/ETH markets if late"}
]
```

### Anti-slop self-check

**Clean** for blueprint: no purple gradient hero, no orb blobs, no emoji bullets, Markets list is a blotter not a 6-card icon grid. **Flag risk if implemented as:** fake multichain logos without Monad settlement — rubric calls that decorative [3].

---

## 8. Copy pack (paste later)

**README / SUBMIT one-liner:**  
Swipe UP or DOWN on short-horizon onchain markets — a mobile trading app on Monad.

**Track:** 01 Onchain Finance & Trading  

**Bounties:** Agora Best Mobile Trading App on Monad · Privy  

**Explicit disclaimer:** Markets are CPMM event contracts (UP/DOWN), not vanilla options.

---

## 9. Success criteria (judge demo)

1. Privy login on iPhone (dev client)  
2. Markets list shows **≥2 assets** with live countdowns (or 1 if ETH delayed — then copy “multi-market ready”)  
3. Swipe trade from Privy wallet on at least BTC  
4. Resolve → Portfolio claim → MonadVision  
5. Video + docs match this IA  
6. `npm run doctor` / `smoke:demo` green  

---

## 10. What I need from you to start implementation

1. Approve **Option T** (or force **S**).  
2. Team roster → lock W1–W8.  
3. Confirm Pyth feed ids for ETH/SOL on Monad testnet.  
4. OK product name **Hunch** + “Markets” IA (no full rebrand).  

**Next coding turn after approval:** W4 Markets IA on design-mode first, then W1–W3 backend.
