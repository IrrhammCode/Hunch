# Demo video script (~90 seconds)

**Product:** Hunch — swipe UP/DOWN on 60s onchain markets on Monad  
**Track:** Metropolis 01 · Agora · Privy · Pyth  
**Format:** 1080×1920 vertical phone capture **or** 16:9 with a phone mockup frame  
**Export:** H.264 MP4, 30fps, loudness ~−16 LUFS if you mix VO

No invented users, TVL, or volume. Show the real loop only.

---

## Shot list

### 0:00–0:08 — Hook + brand

| | |
|---|---|
| **Visual** | Cold open on Hunch splash (dark + lime chevrons) → HUNCH tab with live countdown |
| **On-screen text** | `HUNCH` · `Swipe UP or DOWN. 60s markets on Monad.` |
| **VO** | “This is Hunch — one swipe, sixty seconds, fully onchain.” |
| **B-roll** | Splash icon close-up 1s |

### 0:08–0:20 — Login (Privy OTP)

| | |
|---|---|
| **Visual** | Login screen → email → Send code → cut to inbox OTP (blur code) → Verify & enter |
| **On-screen text** | `Privy email OTP` · `Embedded wallet on Monad` |
| **VO** | “Email OTP via Privy. The embedded wallet becomes your trader — no seed phrase.” |
| **Note** | If Privy is down during recording, state on-screen: `Demo auth fallback` and skip VO claim of OTP |

### 0:20–0:35 — YOU · fund wallet

| | |
|---|---|
| **Visual** | YOU tab → short `0x…` address + “Privy wallet” pill → tap **Fund wallet** → AUSD/MON update |
| **On-screen text** | `Testnet faucet` · `MockAUSD + MON gas` |
| **VO** | “One tap funds testnet collateral and gas. Faucet is capped so we can’t drain the demo.” |

### 0:35–1:05 — HUNCH · swipe

| | |
|---|---|
| **Visual** | Live round: BTC strike, countdown, UP/DOWN odds → swipe **right** → filled toast → countdown ticks down |
| **On-screen text** | `Swipe right = UP` · `Left = DOWN` · `commitBuy from your wallet` |
| **VO** | “Swipe up or down. Your wallet signs the commit. After the delay window we relay execute with a fresh Pyth price.” |
| **B-roll** | Optional split: keeper terminal opening the next round |

### 1:05–1:20 — BOOK · claim + explorer

| | |
|---|---|
| **Visual** | BOOK: position OPEN → WON → **Claim** → toast → **View on MonadVision** opens browser |
| **On-screen text** | `Claim` · `Onchain proof` |
| **VO** | “Resolve on Pyth. Claim in one tap. Open the transaction on MonadVision — that’s the proof.” |

### 1:20–1:30 — Architecture + CTA

| | |
|---|---|
| **Visual** | Static slide or README architecture diagram (mobile → API → keeper → contracts + Pyth) |
| **On-screen text** | `Monad testnet · Privy · Pyth · Agora AUSD shape` · `github.com/IrrhammCode/Hunch` |
| **VO** | “Hunch on Monad. Try the loop — link in the repo.” |

---

## Caption defaults

Use short ALL-CAPS or title-case captions bottom-third, high contrast on `#0A0B0D`. Keep captions on screen ≥1.2s.

Suggested caption strip:

1. SWIPE UP OR DOWN · 60S MARKETS
2. PRIVY EMAIL OTP
3. EMBEDDED WALLET = TRADER
4. FUND TESTNET AUSD + MON
5. COMMIT → PYTH → EXECUTE
6. CLAIM + MONADVISION PROOF

---

## B-roll checklist

- [ ] Splash + home-screen icon
- [ ] OTP email (code blurred)
- [ ] YOU: Privy pill + short address
- [ ] Faucet toast
- [ ] Swipe card motion + haptics (optional)
- [ ] Claim toast + “View on MonadVision”
- [ ] Explorer tx page (hash visible)
- [ ] Optional: `npm run keeper` terminal
- [ ] Optional: MonadVision contract page for Factory

---

## Export tips

- Vertical: 1080×1920, phone UI already portrait
- Landscape: 1920×1080, phone mockup left/center, captions right
- Don’t show real emails, OTP codes, or `PRIVATE_KEY`
- Blur any LAN IP in the API URL chip if needed
- Total runtime **85–95s**

---

## Do not claim

- No fake DAU / volume / “live mainnet”
- No ZeroDev/gasless unless you actually demo it
- No casino language
