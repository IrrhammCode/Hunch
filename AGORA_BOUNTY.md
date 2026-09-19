# Agora Onchain Trading Bounty — testnet is OK

**Bounty:** Best Mobile Trading App on Monad (Agora) — $10,000  
**Eligibility (verbatim gist):** Mobile app that authenticates via **Mera** (passkey), holds/displays **AUSD** balance, and executes trades through **Perpl**.  
**Demo bar:** Login via passkey → fund/view AUSD → **at least one trade on Perpl**.  
**Deadline note:** Platform listed Oct 14, 2026 10:59 GMT+7 — confirm on hackathon.monad.xyz when submitting.

Source: bounty copy provided by team (Metropolis platform) + official docs below (accessed 2026-09-18).

---

## Testnet vs mainnet

| | |
|---|---|
| Bounty text | **No “mainnet only”** requirement |
| Verdict | **Testnet is acceptable** for a working onchain demo |
| Risk | Mainnet may impress more; not required for eligibility |
| What fails eligibility | **Missing Mera / AUSD / Perpl** — not testnet itself |

---

## Official testnet stack (use this in the demo)

### Perpl — Monad Testnet

| Field | Value |
|---|---|
| Chain ID | **10143** |
| REST API | `https://testnet.perpl.xyz/api` |
| WebSocket | `wss://testnet.perpl.xyz` |
| RPC | `https://testnet-rpc.monad.xyz` |
| Exchange | `0x1964C32f0bE608E7D29302AFF5E61268E72080cc` |
| Collateral (aUSD) | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` |
| Decimals | 6 |
| Min account open (testnet) | **~100 AUSD** (read live from `GET /api/v1/pub/context`) |
| Markets (testnet market_id) | BTC **16** · ETH **32** · SOL **48** · MON **64** · ZEC **256** |

Docs: https://docs.perpl.xyz/resources/for-developers/networks-and-configuration.md  
Public context: `GET https://testnet.perpl.xyz/api/v1/pub/context`

Perpl testnet `.env`:

```bash
PERPL_API_URL=https://testnet.perpl.xyz/api
PERPL_WS_URL=wss://testnet.perpl.xyz
PERPL_CHAIN_ID=10143
PERPL_RPC_URL=https://testnet-rpc.monad.xyz
PERPL_EXCHANGE_ADDRESS=0x1964C32f0bE608E7D29302AFF5E61268E72080cc
PERPL_COLLATERAL_TOKEN=0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC
```

### Agora AUSD — Monad Testnet

| Field | Value |
|---|---|
| AUSD | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` |
| Faucet | `0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C` |
| Faucet call | `requestFunds(address)` (via wallet/tx) |

Docs: https://docs.agora.finance/developer/contract-deployments.md  
Guide: https://docs.agora.finance/instant-settlement/guides/getting-testnet-tokens.md

Mainnet AUSD (not required for demo): `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a`

### Mera — Monad passkey auth (implemented)

- Official guide uses **`monadTestnet` (10143)** in viem examples
- React Native: https://docs.monad.xyz/guides/mera/react-native.md
- Code: `mobile/src/auth/mera.ts` + login UI “Continue with Passkey (Mera)”
- Packages: `@category-labs/mera@0.2.0`, `react-native-passkey@3.6.1`, viem, `@scure/bip32`, `@scure/bip39`
- rpId default `accounts.hunch.app` — host AASA/assetlinks (`MERA_SETUP.md`, `site/.well-known/`)
- Accounts are **EOAs** — gas = MON on Monad testnet

---

## Eligibility path vs Hunch today

| Requirement | Status in repo | Still manual |
|---|---|---|
| **Mera passkey auth** | Wired: `@category-labs/mera` + login UI + EIP-1193 provider (`mobile/src/auth/mera.ts`) | Host AASA/assetlinks + EAS rebuild + Team ID |
| **AUSD balance** | Deployments + faucet prefer official Agora testnet `0xa901…22dC` via `requestFunds` | Confirm faucet on-chain in demo video |
| **Perpl trade** | API proxy + mobile ticket → `POST /v1/perpl/order` | `PERPL_API_KEY` (trade scope) + on-chain `createAccount` ≥100 AUSD |

**Note:** Hunch UP/DOWN / Options Exchange can remain as extra product surface. **Agora $10k** requires the **Mera + AUSD + Perpl** path in the **same mobile demo**. Setup details: `MERA_SETUP.md`.

---

## Demo script for judges (Agora path)

1. Open mobile app (native dev client — not Expo Go)  
2. Login → **Continue with Passkey (Mera)** → Face ID → show `0x…` address  
3. YOU tab faucet → **MON** gas + **AUSD** via Agora `requestFunds` (`0xd236…e6C`) — need **≥100 AUSD** for Perpl account  
4. Show **AUSD** balance (Agora testnet token `0xa901…22dC`)  
5. **Perpl testnet** — approve AUSD → `createAccount` → place **one trade** (BTC market_id 16)  
6. Optional: Hunch Markets / Exchange swipe as additional UX  

---

## Honest copy for submission

> Demo runs on **Monad testnet (10143)**. Collateral is **Agora AUSD testnet** `0xa901…22dC`. Auth is **Mera** passkey. Trades execute on **Perpl testnet** Exchange `0x1964…80cc`. Production path = Monad mainnet + mainnet AUSD + Perpl mainnet.

Do **not** claim mainnet production if the demo is testnet.

---

## MetaMask / wallet quick add (Monad testnet)

- Network: Monad Testnet  
- Chain ID: 10143  
- RPC: `https://testnet-rpc.monad.xyz`  
- Explorer: `https://testnet.monadvision.com` (or explorer listed in Monad docs)  
