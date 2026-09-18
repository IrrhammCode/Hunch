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

Hunch is an all-in-one mobile trading app on Monad testnet featuring Perpetual Futures (via Perpl DEX) and 60-second instant UP/DOWN hunches with Agora AUSD collateral. Users log in with Privy email OTP; their embedded wallet is the onchain trader across all instruments. Traders can open leveraged perps on BTC, ETH, SOL, MON or swipe 60s hunches with Pyth settlement, all settled on Monad.

## Long description

See full write-up: [SUBMIT.md](./SUBMIT.md)

Summary: Hunch turns onchain trading into a tactile mobile experience on iOS/Android. It combines decentralized perpetuals (powered by Perpl's onchain CLOB) and short-horizon 60s binary event markets (CPMM + Pyth settlement), both unified under official Agora AUSD collateral. Traders sign directly from their Privy embedded wallet without seed phrase friction.

## Tech stack

- **Mobile:** Expo Router (~57) · React Native · Reanimated + gesture-handler · Privy Expo SDK (`@privy-io/expo`)
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

- Local / LAN: dev client + `http://<LAN_IP>:8787` (see [OPS.md](./OPS.md))
- Public: ngrok/VPS tunnel — see [mobile/README.md](./mobile/README.md)
- Static landing (GitHub Pages): deploy `/site` — then paste Pages URL here

## Video URL

TODO — paste YouTube / Loom / Drive link after recording ([DEMO_VIDEO_SCRIPT.md](./DEMO_VIDEO_SCRIPT.md)).

## Sponsor bounties targeted

- **Agora** — Best Mobile Trading App on Monad ($10,000): Official Agora AUSD collateral + mobile-first trading with Perpl integration.
- **Privy** — Privy Bounty ($5,000): Email OTP + embedded non-custodial wallet as trader of record.
- **Track 01** — Onchain Finance & Trading ($10,000): Fast settlement financial instruments on Monad.
- **Perpl** — Best use of Perpl's API ($5,000): Mobile perpetual trading via Perpl testnet exchange & market context.

## Contract addresses

| Contract | Address | Explorer |
|---|---|---|
| Factory | `0x9b708E57B0a51d03207b0c65392D50de40e1B250` | https://testnet.monadvision.com/address/0x9b708E57B0a51d03207b0c65392D50de40e1B250 |
| Vault | `0xe064D0B2edE1891ebD0F815eDADd45541c62C927` | https://testnet.monadvision.com/address/0xe064D0B2edE1891ebD0F815eDADd45541c62C927 |
| MockAUSD | `0xB5C6B27f0128A317171C5658eAfAC901d52f2989` | https://testnet.monadvision.com/address/0xB5C6B27f0128A317171C5658eAfAC901d52f2989 |
| Pyth | `0x2880aB155794e7179c9eE2e38200202908C17B43` | https://testnet.monadvision.com/address/0x2880aB155794e7179c9eE2e38200202908C17B43 |

Source: `deployments/monad-testnet.json` · Chain ID 10143.

## What was built during the Metropolis window

- Monad testnet contracts (Factory, Market with CPMM + delayed fills, Vault, MockAUSD) + unit/e2e tests
- Keeper (open → resolve via Pyth → residual) and Hono API (rounds, quotes, calldata, faucet, relayed execute)
- Expo iOS app: HUNCH swipe loop, BOOK claim + MonadVision proof, YOU wallet/faucet
- Real Privy email OTP + embedded wallet trade path (approve/commit signed on phone; execute relayed)
- Demo safety: faucet caps + rate limits; execute validation + rate limits
- Branded splash/icons, boot screen, toasts, EAS profiles, judge runbooks + submission docs

## Team notes

TODO — team name / members / contact if the form requires it.

Solo builder: **Irham** · https://github.com/IrrhammCode

## Placeholders still required before submit

- [ ] Video URL
- [ ] TestFlight / EAS demo URL (or tunnel + landing Pages URL)
- [ ] Public API host if not using LAN-only demo
- [ ] Team fields if required
