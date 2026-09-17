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
| **Agora** | AUSD-shaped collateral (6 decimals). Testnet uses `MockAUSD`; production path is Agora AUSD. |
| **Privy** | Email OTP login + Ethereum embedded wallet created on login. Wallet address is the onchain trader. |
| **Pyth** | BTC/USD price feed for strike (open) and settlement (resolve). |

---

## Architecture

```
iOS Expo (Privy OTP + embedded wallet)
        ↓
API :8787 — quote, calldata, faucet (capped), relayed executeBuy
        ↓
Keeper — open → resolve (Pyth) → residual
        ↓
HunchVault → HunchFactory → HunchMarket  +  Pyth  +  AUSD/MockAUSD
```

Trade path: phone `commitBuy` → API `executeBuy` after delay-blocks + Pyth → phone `redeem`.

---

## Contracts (Monad testnet)

| Contract | Address | Explorer |
|---|---|---|
| Factory | `0x9b708E57B0a51d03207b0c65392D50de40e1B250` | [MonadVision](https://testnet.monadvision.com/address/0x9b708E57B0a51d03207b0c65392D50de40e1B250) |
| Vault | `0xe064D0B2edE1891ebD0F815eDADd45541c62C927` | [MonadVision](https://testnet.monadvision.com/address/0xe064D0B2edE1891ebD0F815eDADd45541c62C927) |
| MockAUSD (AUSD stand-in) | `0xB5C6B27f0128A317171C5658eAfAC901d52f2989` | [MonadVision](https://testnet.monadvision.com/address/0xB5C6B27f0128A317171C5658eAfAC901d52f2989) |
| Pyth | `0x2880aB155794e7179c9eE2e38200202908C17B43` | [MonadVision](https://testnet.monadvision.com/address/0x2880aB155794e7179c9eE2e38200202908C17B43) |

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
