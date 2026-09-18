# Metropolis builder perks — Quicknode · Tenderly · Zerion

Email said ~$7,500 in free access. Claim via **Resources → Sponsor perks** on the Metropolis platform.

| Perk | Use in Hunch | Env (root `.env`) |
|---|---|---|
| **Quicknode Build** (3 mo) | Monad **testnet** RPC for API + keeper + phone — avoid 15 req/s public cap | `MONAD_RPC_URL` |
| **Tenderly Pro** | Simulate approve / commitBuy / executeBuy before live gas | `TENDERLY_ACCOUNT` `TENDERLY_PROJECT` `TENDERLY_ACCESS_KEY` |
| **Zerion Builder** (1 mo) | Multi-chain wallet portfolio in PORTFOLIO / YOU | `ZERION_API_KEY` |

---

## 1) Quicknode RPC

1. Claim perk → Quicknode dashboard → create **Monad Testnet** endpoint (chainId **10143**)
2. Copy HTTP URL → root `.env`:
   ```env
   MONAD_RPC_URL=https://YOUR-ENDPOINT.quiknode.pro/xxxx/
   ```
3. Restart API + keeper:
   ```bash
   scripts\win-npm.cmd run api
   scripts\win-npm.cmd run keeper
   ```
4. `scripts\win-npm.cmd run doctor` should say **Monad RPC = Quicknode**

Mobile wallet RPC (optional): `mobile/.env` → `EXPO_PUBLIC_MONAD_RPC_URL` same URL.

---

## 2) Tenderly simulate (no live gas burn)

1. Claim Pro → [dashboard.tenderly.co](https://dashboard.tenderly.co)
2. Account slug + Project name → **Authorization → Access keys** → copy key
3. Root `.env`:
   ```env
   TENDERLY_ACCOUNT=your-account
   TENDERLY_PROJECT=hunch
   TENDERLY_ACCESS_KEY=...
   ```
4. CLI:
   ```bash
   npm run sim:tx              # help
   npm run sim:tx approve      # simulate AUSD mint
   npm run sim:tx commit       # simulate approve + commitBuy
   npm run sim:tx execute      # simulate executeBuy
   ```
5. API (after `npm run api`):
   ```bash
   curl -s localhost:8787/v1/sponsors/status
   curl -s -X POST localhost:8787/v1/tenderly/simulate \
     -H 'Content-Type: application/json' \
     -d '{"kind":"ausd-approve","to":"0xYourWallet"}'
   ```
   Response includes `tenderlyUrl` for the dashboard simulator.

---

## 3) Zerion portfolio

1. Claim Builder → [dashboard.zerion.io](https://dashboard.zerion.io) → **API key**
2. Root `.env`:
   ```env
   ZERION_API_KEY=your_key
   ```
3. Restart API; phone PORTFOLIO can call:
   - `GET /v1/zerion/portfolio/:address`
   - `GET /v1/zerion/positions/:address`
4. Auth: Basic (username = key, password empty) — handled server-side; **key never sent to phone**.

Note: Zerion indexes **production EVM chains** (Ethereum, Base, …). Monad testnet balances stay in Hunch `/v1/wallet` — Zerion supplements the **multichain** story when Base is deployed.

## 4) Perpl trading keys (Agora — real orders)

1. Open https://testnet.perpl.xyz/apikeys → connect wallet → create **trade** key
2. Save **X-API-Key** + **Ed25519 private key** (not recoverable)
3. Root `.env`:
   ```env
   PERPL_API_KEY=...
   PERPL_API_KEY_SECRET=...
   PERPL_API_URL=https://testnet.perpl.xyz/api
   PERPL_WS_URL=wss://testnet.perpl.xyz
   PERPL_CHAIN_ID=10143
   ```
4. On-chain account: send `createAccount` on Exchange `0x1964…80cc` with AUSD testnet
   (min ~100 AUSD) then:
   ```bash
   curl -X POST localhost:8787/v1/perpl/account-link \
     -H 'Content-Type: application/json' \
     -d '{"address":"0xYourPrivyWallet","accountId":<id from tx/account>}'
   ```
5. Orders then go over Perpl trading WS (`execution: perpl-ws`). Without keys, `/v1/perpl/order` **errors** — it will not fake fills.

---

## Verify

```bash
scripts\win-npm.cmd run doctor
curl.exe -s http://127.0.0.1:8787/v1/sponsors/status
```

Expect `quicknode: configured`, `tenderly: configured`, `zerion: configured` after keys are filled.

**Never commit `.env`.**
