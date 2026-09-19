# Metropolis perks — where to paste keys

Claim: hackathon platform → **Resources → Sponsor perks**.

| Perk | Dashboard | Root `.env` key(s) | Best use in Hunch |
|---|---|---|---|
| **Quicknode Build** (3 mo) | https://dashboard.quicknode.com | `MONAD_RPC_URL` | Monad **Testnet** HTTP RPC for API + keeper + Hardhat |
| **Tenderly Pro** | https://dashboard.tenderly.co | `TENDERLY_ACCOUNT` `TENDERLY_PROJECT` `TENDERLY_ACCESS_KEY` | Simulate approve/commit/execute before gas |
| **Zerion Builder** (1 mo) | https://dashboard.zerion.io | `ZERION_API_KEY` | Multi-chain portfolio via `/v1/zerion/*` |
| **Perpl** (Agora) | https://testnet.perpl.xyz/apikeys | `PERPL_API_KEY` `PERPL_API_KEY_SECRET` | Real perps orders (scope **trade**) |

Phone (`mobile/.env`) only needs `EXPO_PUBLIC_*` — **no** server secrets.

---

## Quicknode

1. Claim perk → Quicknode dashboard → **Create endpoint** → chain **Monad** → network **Testnet**
2. Copy HTTP URL (`https://….monad.quiknode.pro/…`)
3. Root `.env`:
   ```env
   MONAD_RPC_URL=https://YOUR-BUILD-ENDPOINT.monad.quiknode.pro/YOUR_TOKEN/
   ```
4. Restart API + keeper
5. `npm run doctor` → **Monad RPC = Quicknode**

Optional: same URL in `mobile/.env` as `EXPO_PUBLIC_MONAD_RPC_URL` (ships in the JS bundle — testnet-only OK).

Docs: https://docs.quicknode.com/docs/monad · chainId **10143**

---

## Tenderly

1. Claim Pro → https://dashboard.tenderly.co
2. Copy **account slug** (URL: `/account/<slug>`) and **project name**
3. **Authorization → Access keys** → create key
4. Root `.env`:
   ```env
   TENDERLY_ACCOUNT=your-account-slug
   TENDERLY_PROJECT=hunch
   TENDERLY_ACCESS_KEY=...
   ```
5. Test:
   ```bash
   npm run sim:tx approve
   curl -s localhost:8787/v1/tenderly/simulate -X POST -H 'Content-Type: application/json' -d '{}'
   ```

Simulate endpoint (official):  
`POST https://api.tenderly.co/api/v1/account/{account}/project/{project}/simulate`  
Header: `X-Access-Key` · Body includes `network_id: "10143"` for Monad testnet [F2].

---

## Zerion

1. Claim → https://dashboard.zerion.io → **Create API key**
2. Root `.env`:
   ```env
   ZERION_API_KEY=your_key
   ```
3. Auth format: Basic — username = key, password empty (server-side only)
4. Restart API; curl:
   ```bash
   curl -s localhost:8787/v1/zerion/portfolio/0xYourAddress
   curl -s localhost:8787/v1/sponsors/status
   ```

Notes [F3]:

- Default API covers **production EVM** (Ethereum, Base, Monad **mainnet**, …)
- Monad **testnet** balances stay in Hunch `/v1/wallet` — Zerion is the multichain portfolio layer
- Best endpoints already wired: `/portfolio` + `/positions`

---

## Verify all three

```bash
scripts\win-npm.cmd run doctor
curl.exe -s http://127.0.0.1:8787/v1/sponsors/status
```

Expect `quicknode`, `tenderly`, `zerion` → `configured`.

**Never commit `.env`.**
