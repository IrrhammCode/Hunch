# Tenderly setup (Hunch)

Simulate txs before sending on Monad testnet. **Optional** for trading — required only if you claim `npm run sim:tx` / `/v1/tenderly/simulate`.

## 1. Dashboard

1. Open https://dashboard.tenderly.co
2. Top-left **organization** (example: `hammxweb3`) → this is `TENDERLY_ACCOUNT`
3. **Projects** → open/create project (example: `monad-b1b640...`) → this is `TENDERLY_PROJECT`
4. **Access Tokens** → **Create Access Token**
   - Name: `hunch-api`
   - Scope: your project
   - Copy token immediately → `TENDERLY_ACCESS_KEY`

## 2. Root `.env` only (never mobile)

```env
TENDERLY_ACCOUNT=hammxweb3
TENDERLY_PROJECT=your-project-slug
TENDERLY_ACCESS_KEY=paste-token-here
```

Do **not** put the token in `mobile/.env` (it would ship in the JS bundle).

## 3. Verify

```powershell
scripts\win-npm.cmd run doctor
# expect: Tenderly keys set (N chars)
```

Optional:

```powershell
scripts\win-npm.cmd run sim:tx
```

API: `POST /v1/tenderly/simulate` returns 503 with a clear error until keys are real (no mock).
