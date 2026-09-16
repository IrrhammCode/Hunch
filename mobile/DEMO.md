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

Repo: https://github.com/IrrhammCode/Hunch

---

## 5-minute path

1. **Open Hunch** — dark splash, lime chevrons mark.
2. **Login** — enter your email → **Send code** → OTP → **Verify & enter**.
3. **YOU tab** — confirm **Privy wallet** + short `0x…` address. Tap **Fund wallet**.
4. **HUNCH tab** — wait for a live round (large countdown). Swipe **right = UP** or **left = DOWN** (or tap the buttons).
5. **Wait ~60s** — keeper resolves with Pyth BTC/USD.
6. **BOOK** — OPEN → WON/LOST → **Claim** when you won.

You’re done. That’s the full loop: Privy identity → embedded wallet → onchain commit → relayed execute → redeem.

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
