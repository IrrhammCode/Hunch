# Hunch — product design system

**Mode:** existing-codebase (extend `mobile/src/theme.ts`, do not invent a second brand)  
**Product:** Mobile **multichain trading app** — short-horizon **UP/DOWN markets** (CPMM event markets), settlement Monad hub + Base surface  
**Audience:** crypto-native mobile users · Metropolis judges  
**Job of the product:** pick a market → swipe a trade → watch portfolio across chains

---

## Identity (one line)

Product UI designer — 90% of time on **Markets list / live ticket**, not marketing chrome.

---

## Visual foundations

| Token | Value | Role |
|---|---|---|
| `bg` | `#0A0B0D` | Arena void |
| `bgElevated` | `#12141A` | Rows / chips |
| `ink` | `#F2F1EC` | Primary text |
| `muted` | `#8B8E97` | Labels / meta |
| `line` | `rgba(242,241,236,0.10)` | Hairlines |
| `brand` | `#D6FF3F` | Primary action / OPEN / focus |
| `up` | `#2EE59D` | UP / won |
| `down` | `#FF4D6A` | DOWN / lost |
| `hub` | `#D6FF3F` (brand) | Settlement hub badge (Monad ★) |
| `pending` | `#8B8E97` | Chain deployed=false |

**Type**

| Role | Face | Use |
|---|---|---|
| Display | `BebasNeue_400Regular` | Screen titles · countdown · brand wordmark |
| Body | `DMSans_400/500/700` | Copy, buttons, UI |
| **Data** | `Menlo` / `Consolas` / `monospace` | Odds ¢, AUSD balances, addresses, countdowns in lists |

**Layout concept:** trading terminal on a phone — **blotter + ticket**, not a dashboard of equal cards.

```
┌─────────────────────────┐
│ MARKETS  filter ALL|…   │  ← instrument strip
│ BTC  monad★  42s  54¢   │  ← blotter row
│ ETH  monad★  31s  48¢   │
│ SOL  base    OPEN  —    │
└─────────────────────────┘
        ↓ tap
┌─────────────────────────┐
│ ETH/USD · MONAD  [ bal ]│
│      31.4               │  ← ticket (swipe)
│   ↑ UP          DOWN ↓  │
└─────────────────────────┘
```

**Signature:** the **swipe ticket** (countdown + odds + UP/DOWN) — one memorable control, everything else quiet blotter.

**Risk (deliberate):** monospace on all **money and odds** only — fintech instrument feel, not Instagram UI. No orbs, no purple, no icon-card grids.

---

## Voice

- Verbs: **Trade**, **Claim**, **Fund**, **Refresh**
- Markets named `BTC-USD`, never “Options”
- Empty: “Keeper is opening the next round.”
- Error: name the fix (API URL, Privy keys) — no vibes

---

## Screens

| Screen | Role | Must feel |
|---|---|---|
| **Markets** | Board of live tickets | Blotter · chain filter · ★ hub |
| **Trade** | Selected market swipe | Instrument · urgent countdown |
| **Portfolio** | Cross-chain positions + claim | Accounting, not second wallet |
| **You** | Identity + faucet + sign out | Sparse |
| Auth | OTP / Apple | Arena entry, brand-first |

---

## Anti-patterns

- Purple gradients / orb glows / bounce particles  
- Tab called **Options** (Greeks confusion)  
- Fake multichain logos without settlement  
- Equal-weight card grids on Markets  
- Inter/Roboto as hero type  

---

## Implementation map

| File | What ships |
|---|---|
| `mobile/src/theme.ts` | tokens + `type.data` mono |
| `mobile/app/(app)/markets.tsx` | blotter |
| `mobile/app/(app)/index.tsx` | swipe ticket |
| `site/index.html` | product story = multichain trading + markets |
| `README.md` / `SUBMIT.md` | same story |

Code in `src/` / contracts stay settlement-first; design only surfaces the product.
