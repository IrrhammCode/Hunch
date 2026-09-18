# REPORT — Hunch pivot to mobile multichain trading (research synthesis)

**Slug:** `research/hunch-multichain-trading/`  
**Date:** 2026-09-18 · **Depth:** standard · **Deadline:** Metropolis submit **13 Oct 2026**

## Executive answer

You **can** reposition Hunch as a **mobile trading app** with short-horizon markets as the flagship module. You **should not** greenfield a full multichain settlement exchange before 13 Oct.

| Option | Meaning | Research verdict |
|---|---|---|
| **P** Full pivot | Multichain trading super-app + true cross-chain settlement | **Do not take** — incomplete demo risk; rubrics punish decorative breadth |
| **T (recommended)** | Trading-app IA + **multi-asset markets** + optional multi-network **surface**; **settlement stays Monad hub** | Best fit to team ambition + bounty + deadline |
| **S** | Ship BTC-only Hunch as today | Safest prize path; use as **fallback if T slips** |
| **R** | Docs-only reposition | Free; always do in copy |

## Key evidence

1. **Track 01** rewards *new financial instruments / fully onchain markets* on Monad — not UI breadth; prize $30k/3 teams [1].  
2. **Agora $10k** = *Best Mobile Trading App on Monad* — mobile + Monad settlement is the named target; Privy $5k still applies [2]. Multichain is **not** a published Agora requirement; full rules sit behind hackathon.monad.xyz [2][15].  
3. **Judging** (Rise In): working demo + meaningful integration > ambition; “do not reward unnecessary complexity”; bounty weight **requirement completion 35%** [2][3][4][7].  
4. **ETHGlobal continuity:** teams that *extend* a working product won sponsor prizes; clock doesn’t grow when repo does [8][9][10]. Hunch already has contracts/keeper/Privy/mobile loop [11]. Remaining work is ops/demo, not greenfield [12].  
5. **Privy** supports any EVM chain via `supportedChains` + switchChain; same EOA; **bridging custom testnet tokens is not shippable** for AUSD/MockAUSD [3][F4].  
6. **Feasible multichain in ~3 weeks:** Rank1 Monad hub + multi-oracle/multi-market board (**low risk**); Rank2 dual settlement Monad+Base (**gate ~Oct 4**); Rank3 bridge/cross-chain BOOK (**blockers — don’t bet Oct 13**) [F4].  
7. **Naming:** Call the feature **Markets / Up-Down / short-horizon event markets** (CPMM, Pyth). Bare **“Options”** invites Greeks/strike expectations and retail binary-options baggage [F3].  
8. **Mobile IA:** Portfolio · Markets · Trade/Predict · You; chain as filter/leg selector, not a global gate; fund then trade in one session [F2].

## Product shape if you pivot (T)

```
Hunch — mobile trading app on Monad
├── Portfolio          (balances, positions, history)
├── Markets            (multi-asset 60s UP/DOWN + odds; BTC first, ETH/SOL next)
├── Market detail      (existing swipe card = flagship “predict/trade” moment)
└── You                (Privy wallet, faucet, chain badge Monad)
Settlement: Monad testnet 10143 (hub)
Multichain: multi-feed markets + optional network badges; dual-chain only if soak green
```

## Risks

- Half-shipped multichain UI → demo score collapse [3][18].  
- Solo capacity vs “strong team” assumption — form still lists solo [16]; **plan assumes extra hands or cut scope to multi-market on Monad only**.  
- RPC 15 req/s already a real constraint (repo `rpcRetry.ts`) [F4].  
- Calling product “Options” is a judge trust risk [F3].

## Open questions

- Official Agora/Privy acceptance criteria text on hackathon.monad.xyz (login required) [15].  
- Team roster: who owns contracts vs mobile vs keeper?  
- Is dual-chain (Base Sepolia) still desired if Rank1 multi-market already demos “trading app”?

## Sources (accessed 2026-09-18)

| # | URL / path |
|---|---|
| [1] | https://monad.xyz/developers/hackathons/metropolis |
| [2] | https://hackathon.monad.xyz · Agora/Privy bounty cards on Metropolis page |
| [3] | https://risein.com/guide/hackathon-judging-rubrics-guide |
| [4] | https://risein.com/guide/hackathon-judge-guide |
| [7] | https://risein.com/guide/hackathon-tracks-and-prizes-guide |
| [8] | https://paragraph.com/@blog.ethglobal/inside-the-continuity-track-debut |
| [9][10] | https://paragraph.com/@blog.ethglobal/changing-how-hackathons-work |
| [11][12] | Repo: `SUBMISSION_FORM.md`, `README.md`, `mobile/DEMO.md` |
| [15] | https://risein.com/monad/monad-metropolis-hackathon |
| [16] | Solo team note in SUBMISSION_FORM vs brief assumption |
| [18] | Rubric low-score definitions (incomplete demo / superficial integration) |
| F2 | `findings/F2.md` — mobile trading IA |
| F3 | `findings/F3.md` — markets vs “options” framing |
| F4 | `findings/F4.md` — multichain architectures |
| F5 | `findings/F5.md` — full claim table + recommendation S |

**Detail dossiers:** `research/hunch-multichain-trading/findings/F1–F5.md`
