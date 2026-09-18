# Research brief — Hunch pivot: mobile multichain trading app

**Slug:** hunch-multichain-trading  
**Date:** 2026-09-18  
**Depth:** standard (3–5 round-1 agents, 1 follow-up max)  
**Spawns into:** `research/hunch-multichain-trading/`

## Question

Should and how should **Hunch** (repo: Hunch on Monad, Track 01) **pivot** from a single-market 60s BTC UP/DOWN mobile app to a **mobile multichain trading app**, keeping **options / short-horizon binary market** as a flagship feature (the “udah bagus” piece)?

## In scope

- Metropolis **Track 01** + **Agora Best Mobile Trading App** + **Privy** bounty fit after a multichain trading pivot
- What “mobile multichain trading app” means for judges vs full exchange
- Patterns from successful mobile trading/crypto apps (IA, must-have features)
- How our **60s option / binary market** feature sits inside a broader trading product
- Multichain stack options feasible **by 2026-10-13** on Monad testnet + other testnets
- Risks: half-shipped pivot vs polished Hunch; RPC limits; team size

## Out of scope

- Implementing code this turn
- Grok/X/social
- Order-book exchange matching engine as a greenfield rebuild (unless evidence says bounty requires it — then call it out as blocker)
- Pitch video production

## Assumptions (locked for this brief)

- Strong team available; deadline **13 Oct 2026** submission
- Existing assets: Solidity HunchFactory/Market/Vault, Pyth BTC feed, keeper/API, Expo app, Privy OTP+wallet, demo hardening
- “Option” feature = **short-horizon UP/DOWN (binary) markets** with CPMM YES/NO, not TradFi equity options
- Multichain = user-facing multi-network trading surfaces, not necessarily one chain only
- Brand tokens already: dark #0A0B0D + lime #D6FF3F + UP/DOWN

## Angles

1. **F1 — Metropolis/Track01/Agora/Privy:** official track examples, bounty language, what judges reward for “mobile trading”
2. **F2 — Mobile multichain trading UX:** leading apps (2025–2026), IA, non-negotiable features for a demo-able MVP
3. **F3 — Binary/short-horizon options as a product:** how Polymarket/Kalshi/derivatives position “options”; how to frame Hunch’s feature inside a trading super-app
4. **F4 — Multichain technical path (3 weeks):** oracles, bridges, wallets, Monad as hub, testnets; what is actually shippable
5. **F5 — Pivot risk & alternatives:** ship-Hunch vs pivot vs “trading market reposition”; competitive/prior-art

## Outputs

- `findings/F1.md` … `F5.md`
- `REPORT.md` — cited strategy report
- Downstream (next turn): `PIVOT_PLAN.md` + `mobile/DESIGN.md` brand delta — **not this research phase**

## Decision this research must support

Pick one for implementation after plan approval:

- **P** — Pivot: multichain mobile trading app, Options module = existing 60s markets  
- **R** — Reposition: stay single-chain Monad, call it mobile onchain markets/trading  
- **S** — Ship Hunch as-is (BTC 60s) + Agora/Privy bounties  

Evidence should say which is highest expected value before **13 Oct**.
