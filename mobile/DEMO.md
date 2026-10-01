# Judge path (5 minutes)

Hunch — swipe UP or DOWN on 60-second fully onchain markets on Monad.

**Track 01 · Agora Mobile · Privy · Pyth**

---

## Before you open the app

Host/mentor should have:

- [ ] iOS **dev client** or TestFlight build installed (not Expo Go)
- [ ] API reachable: LAN `http://<host-ip>:8787` **or** public tunnel URL baked into the build
- [ ] Keeper running (rounds open every ~60s)
- [ ] Privy email OTP enabled

### Mentor day-of checklist

- [ ] Root `.env` has `PRIVATE_KEY` funded with **MON** (gas for execute + Pyth pull)
- [ ] Vault has AUSD seed (`npm run deploy:vault` once; vault not underfunded)
- [ ] `npm run api` + `npm run keeper` running
- [ ] `mobile/.env` Mera rpId + Privy App ID + Client ID set (real auth only)
- [ ] Off-LAN judges: ngrok/tunnel URL in the build (`EXPO_PUBLIC_API_URL`)
- [ ] Smoke once: Fund → swipe → Claim → MonadVision link opens

Repo: https://github.com/IrrhammCode/Hunch

---

## 5-minute path (Agora $10k, Perpl $8k & Track 01)

1. **Open Hunch** — dark splash, lime chevrons mark.
2. **Login** — enter your email → **Send code** → OTP → **Verify & enter** (Privy creates your embedded wallet on Monad Testnet) or use **Mera Passkey** (Face ID).
3. **YOU tab** — confirm wallet + short `0x…` address. Tap **Claim Agora AUSD + Gas MON** (official Agora AUSD `0xa901...22dc`).
4. **TRADE tab — Perpetuals (Perpl DEX)**:
   - Tap **PERPETUALS (PERPL)** at the top.
   - Pick **BTC** (or ETH/SOL/MON).
   - Toggle **TP / SL Guard** → select `+25%` TP and `-10%` SL preset targets.
   - Choose **BUY / LONG**, select **10x** leverage, input margin (e.g. 50 AUSD).
   - Tap **OPEN LONG BTC** → Order executes sub-second on Monad via Perpl signed WebSocket.
5. **TRADE tab — "Hedge-My-Hunch" Cross-Product**:
   - Tap **60s UP/DOWN**.
   - Toggle **⚡ HEDGE ON PERPL** and select `50%` hedge ratio.
   - Swipe **right = UP** (or left = DOWN) on the live round → atomic 60s hunch + inverse SHORT perp hedge on Perpl.
6. **PORTFOLIO tab — Risk & Execution**:
   - Check the **Liquidation Health Gauge** (shows SAFE / MODERATE / DANGER, utilization %, buffer distance).
   - Tap **+ MARGIN** to open the in-app `MarginModal` to deposit/withdraw Agora AUSD collateral.
   - On the active Perpl position:
     - Tap **⟲ REVERSE** to flip position direction in 1 tap.
     - Tap **✕ CLOSE** to close position with 0 slippage.
     - Tap **↗ SHARE** to preview the viral Cyberpunk PnL Share Card with copyable text.
   - Switch to **60s HUNCHES** → tap **CLAIM ONCHAIN** on winning rounds to receive Agora AUSD. Tap **View on MonadVision** for onchain proof.

You’re done. That’s the full loop: Mera/Privy identity → Agora AUSD collateral → Perpl perpetuals DEX + automated TP/SL guard keeper + Hedge-My-Hunch cross-product + live portfolio tracking & claims.

---

## Demo safety (API caps)

| Endpoint | Limit |
|---|---|
| `POST /v1/wallet/faucet` | Max **1000** AUSD/request · MON top-up **0.05** only if below **0.02** · **1 / address / 10 min** · already funded → **200 no-op** |
| `POST /v1/wallet/faucet` | Agora AUSD + MON · rate-limited |
| `POST /v1/trade/execute` | **4 / trader / min** · **12 / IP / min** · market must be a recent factory round · one in-flight execute at a time |

Limits are **in-memory** (reset if API restarts). Errors return `{ error, retryAfterSec? }` with HTTP 429.

---

## What to look for

| Check | Expected |
|---|---|
| Auth | Email OTP (Privy), not a fake local session |
| Trader | YOU shows Privy embedded address |
| Chain | Monad testnet (chainId 10143) |
| Gas/collateral | Faucet tops up MockAUSD + MON on testnet |
| Settlement | Pyth BTC/USD via keeper |

---

## Contracts (Monad testnet)

| Contract | Address |
|---|---|
| Factory | [`0x9b708E57B0a51d03207b0c65392D50de40e1B250`](https://testnet.monadvision.com/address/0x9b708E57B0a51d03207b0c65392D50de40e1B250) |
| Vault | [`0xe064D0B2edE1891ebD0F815eDADd45541c62C927`](https://testnet.monadvision.com/address/0xe064D0B2edE1891ebD0F815eDADd45541c62C927) |
| MockAUSD | [`0xB5C6B27f0128A317171C5658eAfAC901d52f2989`](https://testnet.monadvision.com/address/0xB5C6B27f0128A317171C5658eAfAC901d52f2989) |
| Pyth | [`0x2880aB155794e7179c9eE2e38200202908C17B43`](https://testnet.monadvision.com/address/0x2880aB155794e7179c9eE2e38200202908C17B43) |

Source: `deployments/monad-testnet.json`.

---

## If something fails

| Symptom | Fix |
|---|---|
| “Privy not configured” box | Host must set App ID + Client ID and rebuild / restart Metro |
| API offline toast | Phone can’t reach API — LAN IP or tunnel |
| No live round | Keeper not running or RPC rate-limited |
| Faucet failed | Server `PRIVATE_KEY` missing or RPC flaky — retry |
| Expo Go crash / missing native | Install the **dev client** build |

---

## Links

- GitHub: https://github.com/IrrhammCode/Hunch
- Mobile runbook: [mobile/README.md](./README.md)
- Monad explorer: https://testnet.monadvision.com
