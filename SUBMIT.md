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
3. **Swipe UP/DOWN** on live 60s markets **or** place **Perpl** perps (BTC/ETH/SOL/MON) with 200x leverage.
4. **Hedge-My-Hunch**: Protect 60-second binary positions with 1-tap automated opposite-delta perps on Perpl.
5. **Advanced Perpl Execution**: 1-tap close & 1-tap reverse position, in-app Agora AUSD margin deposit/withdraw, and automated offchain TP/SL guard keeper.
6. **Agora AUSD Hub & P2P QR System**: Profile tab hub showing 2-way AUSD allocation (Wallet Cash + Perpl Margin), VanEck reserve backing, 1-tap Agora faucet, and instant P2P payments via `@username`, `.mon` domains, and dynamic QR scanner/request generator.
7. **Risk & Social**: Real-time Liquidation Health Gauge and viral cyberpunk PnL share cards for social brag sharing.
8. **Settlement**: Pyth oracle settles 60s markets; Perpl signed WebSocket orders execute IOC matching; claim/redeem with proof on MonadVision.

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
| **Agora ($10,000 Bounty)** | Official Agora AUSD Testnet (`0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`) as universal collateral + Agora Faucet (`0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C`) + **Mera passkey** auth + **Agora AUSD Hub Card** (multi-product collateral allocation) + **P2P QR & @Username system** + 10/10 automated verification (`npm run test:agora`). |
| **Perpl ($8,000 Bounties)** | Exchange `0x1964C32f0bE608E7D29302AFF5E61268E72080cc` — live testnet markets via API + signed WebSocket (`mt: 22`); 1-tap close & reverse, in-app margin manager, automated TP/SL guard keeper, and liquidation risk engine (see [PERPL_FEATURES.md](PERPL_FEATURES.md)). |
| **Metropolis Track 01 ($30,000)** | Onchain Finance & Trading differentiator: "Hedge-My-Hunch" unifying binary options and perpetual futures into an atomic delta-hedged mobile derivative. |
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
| Collateral | Official Agora AUSD Testnet (`0xa901...22dC`, 6 decimals) | Agora AUSD Mainnet |
| Faucet | Official Agora Faucet (`0xd236...ee6C`) via `requestFunds` | Direct on-ramp / CEX withdrawal |
| Auth | Mera Passkeys (`@category-labs/mera`) + Privy OTP | Same + session keys / smart accounts |
| Perpl | Perpl Testnet Exchange (`0x1964...80cc`, 8 markets) | Perpl Mainnet Exchange |
| Gas | Testnet MON faucet (capped) | Paymaster / gasless sponsorship |
| Settlement | Pyth Hermes + On-chain Contract Redeem | Same |
| Indexer | In-memory store + event listeners | Full Envio HyperIndex |

---

## 🧪 Comprehensive Automated Test Suites

All tests run against live Monad Testnet and live Perpl DEX:

1. **Agora Bounty Suite:** `npm run test:agora` — **10 / 10 checks passed (100%)**
   - Validates AUSD contract, decimals, Agora Faucet `requestFunds`, Mera passkey standards, Perpl collateral binding, ERC-20 approve/deposit calldata, P2P transfer, QR encoding, handle resolution, and portfolio allocation.
2. **Master E2E Suite:** `npm run test:master` — **22 / 22 checks passed (100%)**
   - Validates live RPC, market pricing, order execution, 1-tap close/reverse, margin deposit/withdraw, Hedge-My-Hunch cross-product, liquidation risk gauge, and viral PnL card.
3. **QR & Directory Suite:** `npm run test:qr` — **7 / 7 checks passed (100%)**
   - Validates `@username` directory, `.mon` domains, raw `0x` addresses, payment URI generation, and QR payload decoding.

---

## Team / repo

**Irham** · https://github.com/IrrhammCode/Hunch

- Mobile runbook: [mobile/README.md](mobile/README.md)
- Video outline: [DEMO_VIDEO_SCRIPT.md](DEMO_VIDEO_SCRIPT.md)
- Agora Bounty Guide: [AGORA_BOUNTY.md](AGORA_BOUNTY.md)
- Perpl Bounty Guide: [PERPL_BOUNTY.md](PERPL_BOUNTY.md)
- Submission paste-back: this file
