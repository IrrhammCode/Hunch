# Hunch x Perpl — Advanced Perpetual Trading Engine & Cross-Product Suite

This document details the 5 major advanced trading, risk management, and cross-product features implemented in **Hunch** powered by **Perpl DEX** and **Agora AUSD** on **Monad Testnet (Chain ID 10143)**.

---

## 🚀 Features Overview

| Feature | Category | Key Components |
|---|---|---|
| **1. 1-Tap Close & Reverse Position** | Execution & UX | Instant IOC market liquidation & directional flipping via signed WebSocket messages (`mt: 22`). |
| **2. In-App AUSD Deposit & Margin Manager** | Margin & Onchain Account | Direct ERC-20 approval + onchain deposit calldata generation (`0x6170c4b1`) & withdrawal for Perpl accounts. |
| **3. TP/SL Guard Engine & Keeper Watcher** | Risk Automation | Sub-second offchain price monitoring with automated liquidation keeper triggers when Take-Profit or Stop-Loss thresholds are hit. |
| **4. "Hedge-My-Hunch" Cross-Product Toggle** | Unified Derivatives | Atomic hedging: swiping UP/DOWN on a 60-second binary hunch automatically opens an inverse protective perpetual position on Perpl. |
| **5. Liquidation Health Gauge & Viral PnL Share Card** | Risk Visualizer & Growth | Multi-tiered health gauge (Safe / Moderate / Danger), buffer metrics, and branded cyberpunk PnL share cards for social distribution. |

---

## 1. 1-Tap Close & Reverse Position

### Problem
Standard perp DEX interfaces require multiple clicks, manual size calculations, and direction reversals that cause significant slippage during fast market movements.

### Solution
- **1-Tap Close:** Closes 100% of an open position using an IOC (Immediate-Or-Cancel) market order in the opposing direction (`mt: 22`).
- **1-Tap Reverse:** Simultaneously closes the active position and opens an identical-sized position in the opposite direction at 200x leverage scale.

### Backend Endpoints
- `POST /v1/perpl/order/close`
  - Body: `{ positionId: string, traderAddress: string }`
  - Returns: `{ success: true, position: PerplPosition }`
- `POST /v1/perpl/order/reverse`
  - Body: `{ positionId: string, traderAddress: string }`
  - Returns: `{ success: true, closedPosition: PerplPosition, newPosition: PerplPosition }`

### Verification Script
```bash
npx ts-node scripts/testPerplClose.ts
```

---

## 2. In-App AUSD Deposit & Margin Manager

### Problem
Traders previously had to leave the mobile application to deposit collateral into the Perpl exchange contract (`0x1964C...80cc`).

### Solution
- Native `MarginModal` sheet directly accessible from the Positions header and risk cards.
- Supports both **Deposit** (ERC-20 `approve(exchange, amount)` + `deposit(accountId, amount)`) and **Withdrawal** (`withdraw(accountId, amount)`).
- Automatically discovers existing Perpl account ID or provisions a new subaccount upon first deposit.

### Backend Endpoints
- `POST /v1/perpl/tx/deposit`
  - Body: `{ amountAUSD: number, traderAddress: string, accountId?: number }`
  - Returns raw calldata for user's embedded wallet (Privy / Mera) to sign on Monad Testnet.
- `POST /v1/perpl/tx/withdraw`
  - Body: `{ amountAUSD: number, traderAddress: string, accountId?: number }`
- `POST /v1/perpl/margin/deposit`
  - Optional sponsored/relayed deposit using backend gas relayer.

### Verification Script
```bash
npx ts-node scripts/testPerplDeposit.ts
```

---

## 3. TP/SL Guard Engine & Keeper Watcher

### Problem
Traders need deterministic risk management without running their own bots or keeping their mobile screens on.

### Solution
- Traders configure Take-Profit (TP) and Stop-Loss (SL) levels directly in the `PerpTradingTicket` via percentage presets (`+10%`, `+25%`, `+50%`, `-10%`, `-20%`, `-50%`) or custom target prices with estimated dollar payouts.
- An offchain **Guard Keeper** monitors real-time mark prices against active positions and automatically fires an IOC close order when price crosses the guard boundary.

### Keeper Architecture
- Standalone keeper: `scripts/perplGuardKeeper.ts`
- Unified background loop: integrated into main keeper (`src/keeper/index.ts`) running every 2.5 seconds.
- State persisted with audit trail (`TP_TRIGGERED` or `SL_TRIGGERED`).

### Backend Endpoints
- `POST /v1/perpl/position/guards`
  - Body: `{ positionId: string, tpPrice?: number, slPrice?: number, traderAddress: string }`
- `POST /v1/perpl/guards/check`
  - Body: `{ traderAddress?: string }`
  - Triggers keeper evaluation manually.

### Verification Script
```bash
npx ts-node scripts/testPerplGuards.ts
```

---

## 4. "Hedge-My-Hunch" Cross-Product Toggle

### Problem
Prediction market binary hunches (60-second binary options) carry 100% directional risk. If the prediction is wrong, the entire stake is lost.

### Solution
- The **Hedge-My-Hunch** toggle links short-term binary markets with Perpl perpetual futures:
  - User bets **UP** on 60s Hunch $\rightarrow$ System automatically opens a **SHORT** position on Perpl.
  - User bets **DOWN** on 60s Hunch $\rightarrow$ System automatically opens a **LONG** position on Perpl.
- Configurable hedge ratios (`25%`, `50%`, `100%` of hunch collateral).
- Linked records tracked in `hunchBook` with `hedgedPerpId` and visual `⚡ DELTA-HEDGED WITH PERPL` indicator on positions.

### Backend Endpoints
- `POST /v1/perpl/hedge/hunch`
  - Body: `{ hunchRoundId: string, hunchSide: "UP" | "DOWN", amountAUSD: number, hedgeRatio: number, traderAddress: string }`
  - Returns: `{ success: true, hedgePosition: PerplPosition, hedgeSide: "LONG" | "SHORT", hedgeMarginAUSD: number }`

### Verification Script
```bash
npx ts-node scripts/testPerplHedge.ts
```

---

## 5. Liquidation Health Gauge & Viral PnL Share Card

### Components
1. **`LiquidationHealthGauge.tsx`:**
   - Multi-segment color gauge:
     - `SAFE` (Margin utilization < 50%, buffer > 20%) $\rightarrow$ Emerald green.
     - `MODERATE` (Margin utilization 50-80%, buffer 10-20%) $\rightarrow$ Amber warning.
     - `DANGER` (Margin utilization > 80%, buffer < 10%) $\rightarrow$ Crimson alert.
   - Shows margin utilization %, nearest liquidation buffer distance, effective leverage, and direct `+ MARGIN` action button.
2. **`PnlShareModal.tsx`:**
   - Dark fintech cyberpunk share card with high-contrast ROI %, dollar return, entry price, mark price, and verified Monad + Agora AUSD watermark.
   - 1-tap clipboard copy formatted with custom emojis ready for Twitter / Farcaster / Telegram bragging.

---

## 🛠️ Verification & Run Commands

All features can be tested directly against live Monad Testnet and Perpl WebSocket:

```bash
# 1. Test 1-Tap Close & Reverse
npx ts-node scripts/testPerplClose.ts

# 2. Test In-App AUSD Deposit & Withdraw Calldata
npx ts-node scripts/testPerplDeposit.ts

# 3. Test TP/SL Guard Engine & Trigger Execution
npx ts-node scripts/testPerplGuards.ts

# 4. Test Hedge-My-Hunch Cross-Product Engine
npx ts-node scripts/testPerplHedge.ts

# 5. Run full E2E Smoke (13/13 Checks)
npx ts-node scripts/e2eSmoke.ts
```
