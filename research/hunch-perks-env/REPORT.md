# REPORT — Quicknode · Tenderly · Zerion for Hunch

**Date:** 2026-09-19 · Findings: `research/hunch-perks-env/findings/`

## Best path per perk

| Perk | Best implement | Why |
|---|---|---|
| **Quicknode** | Root `MONAD_RPC_URL` → Monad Testnet HTTP endpoint `https://….monad.quiknode.pro/…` [1] | API + keeper + Hardhat; private auth vs shared public RPC |
| **Tenderly** | Root `TENDERLY_ACCESS_KEY` + `TENDERLY_ACCOUNT_SLUG` + `TENDERLY_PROJECT_SLUG`; simulate contract **calldata** with `network_id: "10143"` [2] | Dry-run approve/commit/execute before gas |
| **Zerion** | Root `ZERION_API_KEY` only; phone calls Hunch `/v1/zerion/*` (server proxies Basic auth) [3] | Never ship key in Expo bundle |

## Implementation notes (from code + docs)

- Hunch already: `MONAD_RPC_URL` in `src/shared/chain.ts`, `tenderly.ts` simulate helper, `zerion.ts` portfolio proxy [repo].
- Research pitfall: real Quicknode host is **`quiknode.pro`**, not `quicknode.com` — doctor regex fixed to accept both [1].
- Tenderly API tokens need **Pro/Console** (Metropolis perk). Header **`X-Access-Key`** [2].
- Zerion **Monad testnet** needs extra headers (`X-Env: testnet` etc.) — default portfolio is **mainnet EVM** (Base, Monad mainnet) [3]. Testnet AUSD stays on Hunch `/v1/wallet`.

## Open questions

- Whether Tenderly project has Monad testnet enabled for contract simulate (VNET is paid tier beyond Pro [2]).
- Exact Zerion testnet chain names for Monad if we later query testnet assets.

## Sources (accessed 2026-09-19)

1. Quicknode Monad docs — `findings/F1.md` + https://www.quicknode.com/docs/monad  
2. Tenderly simulate / access keys — `findings/F2.md` + https://docs.tenderly.co  
3. Zerion API — `findings/F3.md` + https://developers.zerion.io
