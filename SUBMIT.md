# Hunch — Submission write-up

**Metropolis Track 01 · Agora Mobile · Privy · Pyth**  
**Repo:** https://github.com/IrrhammCode/Hunch  
**Deadline:** Oct 13, 2026

---

## One-liner

**Swipe UP or DOWN on 60-second fully onchain markets, built on Monad.**

---

## Problem

Mobile prediction markets still feel like desktop dashboards with a candlestick chart bolted on. Users need a wallet, gas, long forms, and wait minutes for a result. For short-horizon “will BTC go up this minute?” bets, that friction kills the product.

---

## Solution

Hunch is a one-gesture mobile arena:

1. **Login** with Privy email OTP → embedded wallet on Monad.
2. **Fund** testnet AUSD + MON via a capped faucet.
3. **Swipe UP or DOWN** (or tap) on the live 60s BTC/USD round.
4. Phone signs `approve` + `commitBuy` from the **user’s** embedded wallet.
5. Keeper/API waits delay-blocks, pulls **Pyth**, relays `executeBuy` (shares credit the trader).
6. After resolve, user signs `redeem` in **BOOK** and taps **View on MonadVision**.

No hot-wallet impersonation on the happy path — the Privy wallet is the trader of record.

---

## Why Monad

60-second markets need:

- Fast commit → execute latency (delay-block anti-latency-arb still feels snappy)
- Cheap multi-step ops (approve, commit, execute, redeem, Pyth updates)
- Enough throughput for poll-heavy mobile UIs + keeper loops

Monad testnet (chainId **10143**) is the settlement layer for every round.

---

## Sponsor story

| Sponsor | What we use |
|---|---|
| **Agora** | Official Agora AUSD Testnet (`0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`) used as primary margin and settlement collateral across both Perpetuals and Hunches, with official Agora Faucet integration (`0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C`). |
| **Perpl** | Monad-native decentralized perpetual futures exchange (`0x1964C32f0bE608E7D29302AFF5E61268E72080cc`). Live orderbook, funding rates, and leverage trading for BTC, ETH, SOL, MON. |
| **Privy** | Email OTP login + Ethereum embedded wallet created on login. Wallet address is the onchain trader across all instruments. |
| **Pyth** | Sub-second price feeds on Monad for strike determination and 60-second settlement. |

---

## Architecture

```
iOS Expo (Privy OTP + embedded wallet)
        ↓
API :8787 — Perpl market proxy, quote, calldata, faucet, relayed executeBuy
        ↓
Perpl Exchange (0x1964C...80cc) · Perpetuals order execution & margin
HunchVault → HunchFactory → HunchMarket  +  Pyth  +  Agora AUSD (0xa901...22dc)
```

---

## Contracts & Protocol Addresses (Monad testnet 10143)

| Protocol | Contract | Address | Explorer |
|---|---|---|---|
| **Agora AUSD** | Official Testnet Collateral | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` | [MonadVision](https://testnet.monadvision.com/address/0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC) |
| **Agora Faucet** | Official Testnet Faucet | `0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C` | [MonadVision](https://testnet.monadvision.com/address/0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C) |
| **Perpl DEX** | Perpetual Futures Exchange | `0x1964C32f0bE608E7D29302AFF5E61268E72080cc` | [MonadVision](https://testnet.monadvision.com/address/0x1964C32f0bE608E7D29302AFF5E61268E72080cc) |
| **Hunch Factory** | 60s Market Spawner | `0x9b708E57B0a51d03207b0c65392D50de40e1B250` | [MonadVision](https://testnet.monadvision.com/address/0x9b708E57B0a51d03207b0c65392D50de40e1B250) |
| **Hunch Vault** | LP Seed & Residual | `0xe064D0B2edE1891ebD0F815eDADd45541c62C927` | [MonadVision](https://testnet.monadvision.com/address/0xe064D0B2edE1891ebD0F815eDADd45541c62C927) |
| **Pyth** | Oracle Price Feeds | `0x2880aB155794e7179c9eE2e38200202908C17B43` | [MonadVision](https://testnet.monadvision.com/address/0x2880aB155794e7179c9eE2e38200202908C17B43) |

Source of truth: `deployments/monad-testnet.json` · Chain ID **10143**.

| Contract | Role |
|---|---|
| `HunchFactory` | Spawns 60s rounds |
| `HunchMarket` | CPMM YES/NO, delayed fills, resolve, redeem |
| `HunchVault` | LP seed + residual reclaim |
| `MockAUSD` | Testnet collateral |

---

## How to try

Full 5-minute judge path: **[mobile/DEMO.md](mobile/DEMO.md)**

Summary: install iOS **dev client** (not Expo Go) → email OTP → Fund → swipe UP/DOWN → wait ~60s → BOOK Claim → MonadVision link.

Day-of operator runbook: **[OPS.md](OPS.md)**

---

## Demo vs production

| | Demo (this hackathon) | Production |
|---|---|---|
| Collateral | Mintable MockAUSD | Agora AUSD |
| Auth | Privy email OTP + embedded wallet | Same + passkeys / session keys |
| Gas | Testnet MON faucet (capped) | Paymaster / sponsorship |
| Execute | API relays `executeBuy` after delay-blocks | User or decentralized keepers |
| Faucet | 1000 AUSD cap, 1/addr/10 min | Onramps / liquidity |
| RPC | Public Monad testnet | Dedicated RPC |
| Indexer | File store + Envio scaffold | Full Envio |

API demo safety is documented in README + `mobile/DEMO.md` (in-memory rate limits).

---

## Team / repo

**Irham** · https://github.com/IrrhammCode/Hunch

- Mobile runbook: [mobile/README.md](mobile/README.md)
- Video outline: [DEMO_VIDEO_SCRIPT.md](DEMO_VIDEO_SCRIPT.md)
- Submission paste-back: this file
