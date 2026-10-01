# Demo Video Script (~120 seconds)

**Product:** Hunch — Mobile Perpetuals (Perpl DEX) + 60s Binary Hunches on Monad  
**Tracks & Bounties:**
- **Agora Mobile Trading Bounty ($10,000)** — Mera passkey + Agora AUSD + Perpl trades
- **Perpl API & Automation Bounty ($5,000)** — WebSocket orders, automated TP/SL guard keeper
- **Perpl Analytics & Risk Bounty ($3,000)** — Liquidation health gauge, margin manager
- **Metropolis Track 01 ($30,000)** — "Hedge-My-Hunch" unified cross-product derivative
- **Privy Embedded Wallets Bounty ($5,000)** — Non-custodial embedded wallet on Monad
**Format:** 1080×1920 vertical mobile recording (or 16:9 with phone frame)  
**Export:** H.264 MP4, 30fps

---

## Shot List & Narrative (~2 Minutes)

### 0:00–0:12 — Hook & Brand
- **Visual:** Cold open on Hunch cyber-dark theme, lime chevrons branding. Transition to TRADE screen showing live BTC ticker and 200x leverage slider.
- **On-Screen Text:** `HUNCH` · `Mobile Perpetuals & 60s Hunches on Monad`
- **VO:** *"Trading onchain shouldn't feel like a desktop spreadsheet. This is Hunch — deep perpetual futures and instant 60-second hunches, unified on Monad."*

### 0:12–0:25 — Auth & Agora AUSD Funding
- **Visual:** Login with **Mera Passkey** (Face ID) or Privy OTP. Navigate to **YOU** tab. Tap **Claim Agora AUSD + Gas MON**. Balances update immediately to $9,900 AUSD.
- **On-Screen Text:** `Mera Passkey / Privy` · `Official Agora AUSD (0xa901...22dc)`
- **VO:** *"One tap login with Face ID passkeys creates an embedded Monad wallet. We fund official Agora AUSD testnet tokens directly from the app."*

### 0:25–0:45 — Perpl DEX Trading Ticket & TP/SL Guards
- **Visual:** Switch to **TRADE → PERPETUALS**. Select BTC, 20x leverage. Toggle **TP / SL Guard**. Tap `+25%` TP preset and `-10%` SL preset. Tap **OPEN LONG BTC**. Order fills instantly via signed WebSocket IOC matching.
- **On-Screen Text:** `Perpl DEX (0x1964...80cc)` · `Signed WebSocket IOC` · `Automated TP/SL Guards`
- **VO:** *"On our Perpl hub, open high-leverage perps with sub-second execution. Set Take-Profit and Stop-Loss guards right from the ticket — our keeper monitors mark prices and auto-executes the exit."*

### 0:45–1:05 — "Hedge-My-Hunch" Cross-Product (Metropolis Track 01)
- **Visual:** Switch to **60s UP/DOWN** tab. Toggle **⚡ HEDGE ON PERPL** and select `50%`. Swipe right on **UP**. Show dual confirmation: onchain 60s commitment + linked protective SHORT perp on Perpl.
- **On-Screen Text:** `Metropolis Track 01` · `Hedge-My-Hunch Cross-Product` · `Atomic Delta Hedge`
- **VO:** *"Here's our killer differentiator: Hedge-My-Hunch. When you take a 60-second directional view, one toggle automatically opens an inverse perpetual hedge on Perpl to cushion your downside."*

### 1:05–1:30 — Positions, Liquidation Health & 1-Tap Execution
- **Visual:** Switch to **PORTFOLIO** tab.
  - Highlight the **Liquidation Health Gauge** (`SAFE 98%`, buffer distance, leverage).
  - Tap **+ MARGIN** to preview the in-app `MarginModal` (deposit/withdraw AUSD).
  - Tap **⟲ REVERSE** on the open position — flips direction seamlessly.
  - Tap **✕ CLOSE** — closes position with 0 slippage.
- **On-Screen Text:** `Liquidation Health Gauge` · `In-App AUSD Margin Manager` · `1-Tap Reverse & Close`
- **VO:** *"In your portfolio, track real-time liquidation health with our multi-tier gauge. Deposit more AUSD margin without leaving the app. Flip market sentiment in one tap with Reverse, or close instantly."*

### 1:30–1:45 — Viral PnL Share Card & 60s Hunch Claim
- **Visual:**
  - Tap **↗ SHARE** on a winning position: show the cyberpunk PnL share modal with ROI %, dollar return, and copy button.
  - Switch to **60s HUNCHES** tab. Tap **CLAIM ONCHAIN** on a resolved winning round. Tap explorer link to show the MonadVision transaction.
- **On-Screen Text:** `Viral PnL Share Card` · `Pyth Settlement` · `MonadVision Proof`
- **VO:** *"Share your wins to Twitter with branded PnL cards. Claim your 60-second hunch payouts settled via Pyth on MonadVision."*

### 1:45–2:00 — Architecture & Closing CTA
- **Visual:** Show architecture slide or GitHub repo: Monad Testnet + Perpl DEX + Agora AUSD + Pyth + Privy/Mera.
- **On-Screen Text:** `Built for Metropolis Hackathon` · `github.com/IrrhammCode/Hunch`
- **VO:** *"Fast, tactile, and fully onchain. Check out the code and try Hunch today on Monad testnet."*

---

## Recording Tips for Maximum Judge Impact

1. **Keep Metro & Keeper running:** Ensure `npm run api` and `npm run keeper` are running in background terminals so live rounds tick down and Pyth price updates smoothly.
2. **Audio:** Record clear, confident voiceover matching the timestamps.
3. **Pacing:** Don't linger on loading indicators; cut pauses cleanly.
