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

Hunch is a one-gesture mobile arena + perps terminal:

1. **Login** with **Mera passkey** (Agora) or Privy email OTP → wallet on Monad testnet.
2. **Fund** official **Agora AUSD** + MON via faucet (`requestFunds`).
3. **Swipe UP/DOWN** on live 60s markets **or** place **Perpl** perps (BTC/ETH/SOL/MON).
4. Wallet signs on-chain txs (approve/commit or Perpl deposit/order path).
5. Keeper pulls **Pyth**, relays `executeBuy`; Perpl orders go through signed trade API.
6. Claim/redeem on BOOK; proof on MonadVision.

No mock balances, no demo login — real API + real chain only.

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
| **Agora** | Official Agora AUSD Testnet (`0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`) as collateral + Agora Faucet (`0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C`) + **Mera passkey** auth (bounty path). |
| **Perpl** | Exchange `0x1964C32f0bE608E7D29302AFF5E61268E72080cc` — live testnet markets via API; trade-scope keys + on-chain `createAccount`. |
| **Quicknode** | Dedicated Monad testnet RPC (`*.monad-testnet.quiknode.pro`) for API, keeper, Hardhat, and phone wallet. |
| **Privy** | Email OTP + embedded wallet as alternate login / Track 01 path. |
| **Pyth** | Hermes + on-chain feeds for 60s settlement (BTC/ETH/SOL). |
| **Zerion** | Multi-chain portfolio proxy on YOU tab (server-side key). |
| **Mera** | Passkey → BIP-44 EOA on Monad testnet (`mobile/src/auth/mera.ts`). |

**Honest demo stack:** Monad testnet **10143** · Agora AUSD testnet · Perpl testnet · Quicknode Build RPC. Production path = mainnet AUSD + Perpl mainnet + same auth patterns.

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
