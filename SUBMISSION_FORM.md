# Submission form fields (paste-ready)

Fill TODOs before submitting on Metropolis / Rise In.

> **Before you submit:** run `npm run doctor` at the repo root. It must not fail on Privy IDs or `PRIVATE_KEY`. Setup: [PRIVY_SETUP.md](./PRIVY_SETUP.md) · [EAS_SETUP.md](./EAS_SETUP.md).

---

## Project name

Hunch

## Tagline / one-liner

Swipe UP or DOWN. 60-second markets on Monad.

## Track

01 — Onchain Finance & Trading

## Short description (2–3 sentences)

Hunch is a mobile arena for 60-second BTC/USD UP/DOWN markets on Monad testnet. Users log in with Privy email OTP; their embedded wallet is the onchain trader. After a swipe, the phone signs commitBuy, the API relays executeBuy with a fresh Pyth price, and winners claim with a one-tap MonadVision link.

## Long description

See full write-up: [SUBMIT.md](./SUBMIT.md)

Summary: Hunch turns short-horizon prediction into one gesture on iOS. Factory spawns 60s markets seeded by the Vault (AUSD-shaped collateral). Traders commit YES/NO (UP/DOWN) with delayed fills to blunt latency arb; settlement uses Pyth BTC/USD. Demo hardens the API with faucet caps and execute rate limits so mentors cannot drain the hot wallet mid-pitch.

## Tech stack

- **Mobile:** Expo Router (~57) · React Native · Reanimated + gesture-handler · Privy Expo SDK (`@privy-io/expo`)
- **Contracts:** Solidity 0.8.24 · Hardhat · OpenZeppelin · HunchFactory / HunchMarket / HunchVault · MockAUSD
- **Oracle:** Pyth BTC/USD pull updates (Hermes)
- **Backend:** Node · Hono API on :8787 · keeper loop · file indexer (+ Envio scaffold)
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

- **Agora** — Best Mobile Trading App (AUSD-shaped collateral, iOS-first product)
- **Privy** — email OTP + embedded wallet as trader of record

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
