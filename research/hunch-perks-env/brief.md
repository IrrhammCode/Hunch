# Research brief — Metropolis perks for Hunch

**Slug:** `hunch-perks-env`  
**Date:** 2026-09-18  
**Depth:** standard (3 round-1 agents, 1 follow-up max)  
**Workspace:** `research/hunch-perks-env/`

## Question

What is the **best implementation path** for each Metropolis builder perk on Hunch, and which **env vars** must Irham fill?

| Perk | Integrate for |
|---|---|
| Quicknode Build (3 mo) | Monad testnet RPC for API/keeper/phone — beat public rate limits |
| Tenderly Pro | Simulate approve/commit/execute before live gas; debug reverts |
| Zerion Builder (1 mo) | Multi-chain wallet portfolio in PORTFOLIO / YOU |

## In scope

- Official docs: endpoints, auth, env names, limits
- Exact implementation Hunch already has vs what is missing
- Recommended **root `.env`** + **mobile `.env`** keys (placeholders only)
- Per-step setup for Irham (dashboard → paste key → restart → verify)

## Out of scope

- Committing real secrets
- Running EAS / Apple login
- Mera / Perpl order implementation (separate)

## Assumptions

- Stack: Hono API :8787, keeper, Expo mobile, Privy OTP
- Contract chain: Monad testnet 10143
- Perks claimed on Metropolis Resources page
- Keys never printed; doctor yes/no only

## Angles

1. **F1 Quicknode** — Monad RPC best practice, env, verification
2. **F2 Tenderly** — simulation API, keys, CLI/Hunch fit
3. **F3 Zerion** — portfolio API auth, endpoints, UI use

## Outputs

- `findings/F1–F3.md`
- `REPORT.md`
- Updated **root `PERKS.md` + `.env.example`** + **mobile `.env.example`** (placeholders)
