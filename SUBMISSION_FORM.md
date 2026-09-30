# Submission form fields (paste-ready)

Fill TODOs before submitting on Metropolis / Rise In.

> **Before you submit:** run `npm run doctor` at the repo root. It must not fail on Privy IDs or `PRIVATE_KEY`. Setup: [PRIVY_SETUP.md](./PRIVY_SETUP.md) · [EAS_SETUP.md](./EAS_SETUP.md).

---

## Project name

Hunch

## Tagline / one-liner

All-in-one mobile trading app on Monad: Perps via Perpl + 60s swipe hunches with Agora AUSD.

## Track

01 — Onchain Finance & Trading

## Short description (2–3 sentences)

Hunch is an all-in-one mobile trading app on Monad testnet featuring Perpetual Futures (via Perpl DEX) and 60-second instant UP/DOWN hunches with Agora AUSD collateral. Users log in with **Mera passkey only** (Face ID — no seed phrase); the passkey EOA is the onchain trader. Traders open leveraged perps or swipe 60s hunches with Pyth settlement — all on Monad.

## Long description

See full write-up: [SUBMIT.md](./SUBMIT.md)

Summary: Hunch turns onchain trading into a tactile mobile experience on iOS/Android. It combines decentralized perpetuals (powered by Perpl's onchain CLOB) and short-horizon 60s binary event markets (CPMM + Pyth settlement), both unified under official Agora AUSD collateral. Traders sign directly from their Privy embedded wallet without seed phrase friction.

## Tech stack

- **Mobile:** Expo Router (~57) · React Native · Reanimated + gesture-handler · **Mera passkey only** (`@category-labs/mera`)
- **DEX & Margin:** Perpl Perpetual Exchange on Monad Testnet (`0x1964C32f0bE608E7D29302AFF5E61268E72080cc`)
- **Collateral:** Agora AUSD (`0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`) + Agora Faucet (`0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C`)
- **Contracts:** Solidity 0.8.24 · Hardhat · HunchFactory / HunchMarket / HunchVault
- **Oracle:** Pyth real-time price feeds (Hermes pull on Monad)
- **Backend:** Node · Hono API on :8787 · Perpl proxy · keeper loop
- **Chain:** Monad testnet, chainId **10143**

## Repo URL

https://github.com/IrrhammCode/Hunch

## Demo URL

TODO — paste public URL after host is live.

- Local / LAN (current): `http://192.168.100.3:8787` + Expo dev client (API verified `/health` + Perpl markets)
- Public: set ngrok/VPS URL in `mobile/.env` + `mobile/eas.json` preview → paste here
- Landing: deploy `/site` + `site/.well-known/` (Mera AASA/assetlinks templates)

## Video URL

TODO — record after Mera login + AUSD + one Perpl trade ([DEMO_VIDEO_SCRIPT.md](./DEMO_VIDEO_SCRIPT.md)).

## E2E smoke (live, npm run e2e:smoke)

| Check | Result |
|---|---|
| Quicknode + Perpl trade keys | PASS |
| Price BTC/ETH + history | PASS |
| Markets board BTC,ETH,SOL | PASS |
| Perpl markets n=8 | PASS |
| Perpl account 643/644 + risk | PASS |
| Wallet AUSD 9900 | PASS |
| Chain block / MON | PASS (MON low ~0.02) |
| Perpl IOC order | PASS (WS code 0, account 643) |

## Stack verified (live)

| Piece | Status |
|---|---|
| Quicknode Monad testnet RPC | configured (api/keeper/indexer/hardhat) |
| Agora AUSD collateral | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` |
| Perpl markets API | live (7 perps) |
| Perpl trade keys | configured in root `.env` |
| Zerion portfolio proxy | configured |
| Tenderly simulate | pending perk keys (real API only, no mock) |
| Mobile typecheck | clean |
| Product mocks | removed (`/v1/demo` gone, real auth only) |

## Team notes

Solo builder: **Irham** · https://github.com/IrrhammCode

## Placeholders still required before submit

- [ ] Video URL
- [ ] Public demo URL (ngrok/Pages) — replace `YOUR_NGROK_OR_VPS_HOST` in `mobile/eas.json`
- [ ] Tenderly keys if claiming that perk in write-up
- [ ] Mera association files hosted (Team ID + Android SHA256)
- [ ] Perpl `createAccount` + account-link if not yet on-chain for demo wallet

## Sponsor bounties targeted

- **Agora** — Best Mobile Trading App on Monad ($10,000): **Mera passkey** + official Agora AUSD + **Perpl** trade in one mobile demo
- **Monad Foundation** — Best Mera-Powered UX ($2,500): passkey is the entire account layer (no seed phrase, no extension)
- **Perpl** — Best use of Perpl's API ($5,000): mobile + `perpl:bot` automation ([PERPL_BOUNTY.md](./PERPL_BOUNTY.md))
- **Perpl** — Best Analytics / Risk Tool ($3,000): live risk panel ([PERPL_BOUNTY.md](./PERPL_BOUNTY.md))
- **Track 01** — Onchain Finance & Trading ($30,000): 60s markets + perps on Monad

> Login is **Mera passkey only** (Face ID). Privy was removed from the product path.


## Contract addresses

| Contract | Address | Explorer |
|---|---|---|
| Factory | `0x9b708E57B0a51d03207b0c65392D50de40e1B250` | https://testnet.monadvision.com/address/0x9b708E57B0a51d03207b0c65392D50de40e1B250 |
| Vault | `0xe064D0B2edE1891ebD0F815eDADd45541c62C927` | https://testnet.monadvision.com/address/0xe064D0B2edE1891ebD0F815eDADd45541c62C927 |
| Agora AUSD (collateral) | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` | https://testnet.monadvision.com/address/0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC |
| Agora AUSD faucet | `0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C` | https://testnet.monadvision.com/address/0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C |
| Perpl Exchange | `0x1964C32f0bE608E7D29302AFF5E61268E72080cc` | https://testnet.monadvision.com/address/0x1964C32f0bE608E7D29302AFF5E61268E72080cc |
| Pyth | `0x2880aB155794e7179c9eE2e38200202908C17B43` | https://testnet.monadvision.com/address/0x2880aB155794e7179c9eE2e38200202908C17B43 |

Source: `deployments/monad-testnet.json` · Chain ID 10143.

## What was built during the Metropolis window

- Monad testnet contracts (Factory, HunchMarket CPMM + delayed fills, Vault) + unit/e2e tests
- **Official Agora AUSD** as collateral + faucet path; **Perpl** perps proxy + trade keys
- **Mera passkey** is the entire account layer (Agora bounty + Mera UX bounty)
- **Quicknode** dedicated RPC for API/keeper/Hardhat/phone
- Keeper (Pyth open/resolve) + Hono API (markets, calldata, faucet, execute, Perpl, Zerion)
- Expo app: Markets / Trade / Exchange / Portfolio / YOU — real trades only (no mock UI)
- Branded assets, EAS profiles, judge runbooks (`SUBMIT.md`, `DEMO.md`, `AGORA_BOUNTY.md`, `MERA_SETUP.md`)

## Team notes

Solo builder: **Irham** · https://github.com/IrrhammCode

## Placeholders still required before submit

- [ ] Video URL
- [ ] Public demo URL (ngrok/Pages)
- [ ] Tenderly keys if claiming that perk
- [ ] Mera AASA/assetlinks hosted
- [ ] Perpl createAccount + account-link for demo wallet
- [ ] Hot wallet MON top-up if keeper gas drops below threshold

