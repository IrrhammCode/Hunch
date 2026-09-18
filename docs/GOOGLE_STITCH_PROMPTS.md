# 🎨 Google Stitch Prompts — Hunch Mobile Trading App on Monad

Koleksi prompt komprehensif untuk mendesain UI/UX **Hunch** (All-in-One Mobile Trading App on Monad) di **Google Stitch** atau AI UI Design Generators (Galileo, v0, Midjourney UI).

Aplikasi ini ditujukan untuk **$10,000 Agora Onchain Trading Bounty** dan **$5,000 Privy Bounty** pada Hackathon Monad Metropolis.

---

## 🎨 Global Design System & Styling Rules

Gunakan parameter ini di semua prompt agar konsisten:
- **Device Frame**: iPhone 16 Pro (393 × 852 pt), bezel-less, high contrast dark cyber theme.
- **Theme**: Obsidian Dark Arena (`#0A0B0D` background, `#12141A` card surfaces, `#20242D` borders).
- **Accents**:
  - `Acid Lime (#D6FF3F)`: Brand primary, active tabs, main CTAs.
  - `Neon Green (#2EE59D)`: UP hunches, Longs, positive PnL gains.
  - `Hot Coral (#FF4D6A)`: DOWN hunches, Shorts, losses, sell orders.
  - `Monad Electric Purple (#836EF9)`: Monad branding & badges.
  - `Slate Muted (#8B93A7)`: Subtitles, inactive tabs.
- **Typography**: SF Pro / Inter for UI titles, **JetBrains Mono** / tabular numerals for crypto prices, strikes, timers, and balances.
- **Navigation Dock**: 4 floating tabs at the bottom (`[⚡ Trade]`, `[📊 Markets]`, `[💼 Portfolio]`, `[👤 Profile]`).

---

## 📱 Screen 1: Passwordless Onboarding (Apple Sign-in + Privy Email OTP)

```text
A high-fidelity mobile UI design for a crypto mobile trading app called "Hunch", built on Monad.
Screen: AUTHENTICATION & ONBOARDING (Clean, passwordless entry).

DEVICE & FRAME:
- iPhone 16 Pro (393x852 pt), bezel-less, immersive dark background (#0A0B0D).

HEADER & HERO BRANDING:
- Centered at the top: Glowing neon brandmark with an abstract lightning-bolt "H" glyph in electric acid-lime (#D6FF3F).
- Title: "HUNCH" in bold, geometric uppercase typography with tight letter tracking.
- Subtitle: "Fast Onchain Trading on Monad" with a small glowing badge "⚡ 1s Finality • Agora AUSD Collateral".

MAIN AUTHENTICATION CARD (Surface #12141A with subtle border #20242D):
- Passwordless philosophy: No seed phrases, no passwords.

1. PRIMARY CTA (Apple Sign-In):
   - Large full-width button in pure Cyber White (#FFFFFF) with solid black text and Apple logo icon.
   - Text: "Continue with Apple".

2. DIVIDER:
   - Subtle horizontal divider with centered text "or continue with email" in muted slate (#8B93A7).

3. EMAIL OTP FIELD:
   - Dark pill input field (#181B22) with a subtle glowing border on focus.
   - Placeholder: "Enter your email address...".
   - Helper label below: "We'll send a 6-digit one-time passcode. No password needed."

4. ACTION BUTTON:
   - Full-width high-contrast button in solid Acid Lime (#D6FF3F) with bold black text.
   - Text: "Send One-Time Passcode →".

FOOTER & TRUST BADGES:
- At the bottom of the screen:
  - "Secured by Privy Embedded Wallet • Monad Testnet" with small lock and shield icons.
  - Microtext: "By continuing, you agree to decentralized smart contract terms."
```

---

## 📱 Screen 2: Main Trading Hub Dashboard (Tab 1: "TRADE")

```text
A high-fidelity mobile UI design for an all-in-one crypto trading mobile app called "Hunch" on Monad.
Screen: MAIN TRADING HUB (Tab 1: TRADE active in the bottom navigation).

DEVICE & FRAME:
- iPhone 16 Pro (393x852 pt), obsidian dark arena theme (#0A0B0D).

TOP STATUS BAR & HEADER:
- Top left: "HUNCH" logo mark with small pulse indicator "🟢 Monad Testnet (10143)".
- Top right: Balance pill showing "$2,450.00 AUSD" in tabular mono font, with a small "+" deposit button.

TOP MODE SELECTOR (Segmented Pill Switcher):
- Prominent toggle switch with 2 options:
  * Option A (ACTIVE): "[📈 Perpetuals 20x]" (Glowing Acid Lime outline #D6FF3F, dark filled)
  * Option B: "[⚡ 60s UP/DOWN]" (Inactive muted slate)

MARKET PAIR HEADER:
- Pair: "MON / AUSD Perpetual" with Monad purple logo.
- Current Price: "$3.852" in large bold mono typography.
- 24h Change badge: "+14.2%" (neon green badge #0E2B1F with text #2EE59D).
- 24h High: $4.10 | Low: $3.20 | Funding: 0.010% / 1h.

MINI CANDLESTICK CHART AREA:
- Sleek 15-minute candlestick chart with smooth neon green glow on bullish candles and neon coral on bearish candles.

PERPETUAL ORDER EXECUTION TICKET:
- Order side toggle buttons:
  * Left button (Active): "LONG / BUY" in solid neon green (#2EE59D) with black bold text.
  * Right button: "SHORT / SELL" in dark outline with hot coral (#FF4D6A) border.
- Leverage Slider:
  * Horizontal slider from 2x to 20x.
  * Currently selected: "10x" in an acid-lime badge.
- Margin Input Field:
  * Input: "100" AUSD.
  * Quick select chips: "[25 AUSD] [50 AUSD] [100 AUSD] [MAX]".
- Trade Summary Specs:
  * Position Size: 1,000 AUSD (259.7 MON)
  * Liquidation Price: $3.48
  * Est Fee: 0.10 AUSD (Agora Collateral)
- BIG PRIMARY EXECUTION CTA:
  * Wide prominent button: "⚡ Open Long 10x (100 AUSD)" in vibrant neon green with haptic feel.

BOTTOM FLOATING NAVIGATION BAR:
- Floating glassmorphism dock:
  1. [⚡ Trade] (ACTIVE: Acid Lime icon & label with neon dot)
  2. [📊 Markets] (inactive)
  3. [💼 Portfolio] (inactive)
  4. [👤 Profile] (inactive)
```

---

## 📱 Screen 3: 60-Second Swipe Hunch Card Experience (Fast Binary Trading)

```text
A high-fidelity mobile UI design for a crypto mobile trading app called "Hunch", built on Monad Testnet.
Screen: 60-SECOND SWIPE HUNCH MODE (Sub-mode inside Trade tab for ultra-fast binary hunch predictions).

DEVICE & FRAME:
- iPhone 16 Pro (393x852 pt), immersive dark arena (#0A0B0D).

TOP SEGMENTED SWITCHER:
- "[📈 Perpetuals 20x]" (inactive)
- "[⚡ 60s UP/DOWN]" (ACTIVE: Glowing acid-lime highlight #D6FF3F)

CENTRAL SWIPEABLE TRADING CARD (Hero Element):
- Floating Tinder-style cyber glass card (#12141A) with neon gradient border:
  * Market: "BTC / USD" (60-second settlement round #1842).
  * Big Circular Countdown Timer: "00:42.5" remaining in glowing yellow-orange countdown ring.
  * Strike Benchmark Price: "$92,400.00" (Pyth low-latency oracle).
  * Current Live Price: "$92,465.20" (+0.07% above strike, pulsing neon green).
  * Pool Odds & Pot: "Total Pool: 14,200 AUSD | YES Payout: 1.84x | NO Payout: 2.15x".
  * Visual swipe indicator arrows:
    - Left arrow (Red): "← Swipe Left for DOWN / NO"
    - Right arrow (Green): "Swipe Right for UP / YES →"

STAKE SELECTOR (Below Card):
- "Select Wager (AUSD Collateral):"
- Quick chips: "[5 AUSD] [10 AUSD] [25 AUSD] [CUSTOM]" (10 AUSD active in acid-lime).

DUAL TAP ACTION BUTTONS (For non-swipe users):
- Bottom dual buttons:
  * Left: Wide red card button "🔻 DOWN / NO (2.15x)" (#FF4D6A)
  * Right: Wide green card button "🔺 UP / YES (1.84x)" (#2EE59D)
- Subtext: "Settles onchain in 60 seconds • Monad 1s finality".

BOTTOM NAVIGATION DOCK:
- [⚡ Trade] (Active), [📊 Markets], [💼 Portfolio], [👤 Profile].
```

---

## 📱 Screen 4: Unified Portfolio & 1-Tap Claim Screen (Tab 3: "PORTFOLIO")

```text
A high-fidelity mobile UI design for a crypto trading app called "Hunch", built on Monad.
Screen: UNIFIED PORTFOLIO & EARNINGS CLAIM (Tab 3: PORTFOLIO active).

DEVICE & FRAME:
- iPhone 16 Pro (393x852 pt), obsidian dark arena (#0A0B0D).

TOP TOTAL PORTFOLIO VALUE (Hero Header):
- Label: "TOTAL TRADING EQUITY" in small uppercase tracking.
- Net Equity: "$3,842.50 AUSD" in large bold JetBrains Mono.
- 24h PnL pill: "+$428.10 (+12.5%)" in glowing neon green badge (#2EE59D).

1-TAP CLAIMABLE WINNINGS BANNER:
- Eye-catching reward banner with gold/lime glowing animated border:
  * Left: Trophy / gift icon.
  * Text: "You have 3 Won Hunches to Claim!"
  * Total Winnings: "+185.40 AUSD"
  * Right Action Button: Compact solid Acid-Lime button "Claim All (1-Tap) ⚡".

PORTFOLIO SEGMENT TABS:
- "[Open Positions (2)]" (Active) | "[History & Settled (14)]"

POSITION CARD 1: PERPETUAL LONG (Perpl DEX):
- Dark card (#12141A) with green vertical accent bar:
  * Header: "MON / AUSD" badge "[LONG 10x]"
  * Entry Price: $3.42 | Mark Price: $3.85
  * Margin: 100 AUSD | Size: 1,000 AUSD
  * Unrealized PnL: "+$125.70 AUSD (+125.7%)" (Bright Neon Green)
  * Action: Small red outline button "Close Position".

POSITION CARD 2: 60s HUNCH POSITION:
- Dark card (#12141A) with yellow live indicator:
  * Header: "BTC UP/DOWN • Round #1842"
  * Predicted: "UP (Strike: $92,400.00)"
  * Stake: 25 AUSD | Status: "Resolving in 12s..."
  * Potential Return: "46.00 AUSD".

BOTTOM NAVIGATION DOCK:
- [⚡ Trade], [📊 Markets], [💼 Portfolio] (ACTIVE: glowing lime), [👤 Profile].
```

---

## 📱 Screen 5: Markets Explorer Screen (Tab 2: "MARKETS")

```text
A high-fidelity mobile UI design for a crypto trading app called "Hunch", built on Monad Testnet.
Screen: MARKETS EXPLORER (Tab 2: MARKETS active in the bottom navigation bar).

DEVICE & FRAME:
- iPhone 16 Pro (393x852 pt), bezel-less, high contrast dark theme (#0A0B0D).

HEADER & SEARCH:
- Top bar: Title "MARKETS" in bold uppercase cyber font.
- Right: Live block latency indicator "🟢 1s Block Finality".
- Search input bar: Dark rounded pill with magnifying glass, placeholder "Search pairs (MON, BTC, ETH, AUSD)...".
- Filter pills:
  * "[All Markets]" (Active, acid-lime outline #D6FF3F)
  * "[⚡ 60s Blitz]"
  * "[📈 Perpetuals 20x]"
  * "[🔥 Memes & L1s]"

FEATURED BANNER:
- Card: "🔥 HOT ON MONAD: MON/AUSD Perp"
- Price: $3.85 (+14.2% 24h), smooth neon green sparkline curve.
- Quick CTA: "Trade Now →".

MARKET LIST VIEW (High-density rows):
1. MON / AUSD
   - Icon: Monad purple token + "[PERP 20x]".
   - Price: "$3.852", 24h: "+14.25%".
   - Subtext: "Vol: $1.2M AUSD • Funding: 0.010%".
2. BTC / AUSD
   - Icon: Bitcoin orange + "[PERP 20x]".
   - Price: "$94,210.50", 24h: "+3.18%".
   - Subtext: "Vol: $4.8M AUSD".
3. ETH / AUSD (60s Blitz)
   - Icon: Ethereum + "[⚡ 60s HUNCH]".
   - Price: "$3,420.10", 24h: "-1.42%".
   - Subtext: "Round #1420 • Pool: 25,400 AUSD".
4. SOL / AUSD
   - Icon: Solana gradient + "[PERP 20x]".
   - Price: "$182.40", 24h: "+5.90%".
   - Subtext: "Vol: $890K AUSD".
5. PUMP / AUSD
   - Icon: Meme rocket + "[PERP 10x]".
   - Price: "$0.00421", 24h: "+42.80%".
   - Subtext: "Vol: $340K AUSD".

BOTTOM NAVIGATION DOCK:
- [⚡ Trade], [📊 Markets] (ACTIVE: Glowing lime), [💼 Portfolio], [👤 Profile].
```

---

## 📱 Screen 6: Embedded Wallet & Agora Faucet Hub (Tab 4: "PROFILE / YOU")

```text
A high-fidelity mobile UI design for a crypto trading app called "Hunch", built on Monad Testnet.
Screen: USER PROFILE & EMBEDDED WALLET HUB (Tab 4: PROFILE active).

DEVICE & FRAME:
- iPhone 16 Pro (393x852 pt), dark futuristic aesthetic (#0A0B0D).

HEADER & USER IDENTITY:
- Title: "YOU & WALLET".
- User: "irham***@privy.id" connected via Apple ID / Privy.
- Network badge: "🟢 Monad Testnet (Chain 10143)".

PRIVY EMBEDDED WALLET CARD:
- Glassmorphism dark card with subtle cyber grid background.
- "Embedded Smart Wallet" label powered by Privy.
- Address: "0x8f2...4E9a" with 1-tap "Copy" and QR code button.
- Total Value: "$3,450.80 AUSD" in bold mono font.
- Asset Breakdown:
  * "14.50 MON" (Monad Gas Token)
  * "3,400.00 AUSD" (Agora USD Trading Collateral)

PROMINENT HACKATHON FAUCET CALLOUT:
- Glowing card (Electric Purple to Acid Lime gradient border):
  * Title: "Need Testnet Trading Funds?"
  * Subtitle: "Claim 1,000 AUSD Agora Collateral & test MON gas instantly."
  * Action Button: Solid Acid Lime button (#D6FF3F) with bold black text: "🚰 Claim 1,000 AUSD Faucet".

TRADING STATS (2x2 Grid):
- Win Rate: "68.4%"
- Total PnL: "+$1,240.50 AUSD"
- 60s Streak: "5 Wins 🔥"
- 24h Volume: "$42,500 AUSD"

HACKATHON BADGES:
- "Agora AUSD Pioneer", "Monad Speed Demon (1s Finality)", "Privy Passwordless Pro".

APP PREFERENCES:
- "1-Click Trading Mode (Skip Signatures)" (Toggle Active).
- "Sound & Haptics" (Active).
- "Export Wallet Keys" (Privy backup).
- "Sign Out" in muted red.

BOTTOM NAVIGATION DOCK:
- [⚡ Trade], [📊 Markets], [💼 Portfolio], [👤 Profile] (ACTIVE: Glowing lime).
```
