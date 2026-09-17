/**
 * In-memory mock backend for UI design.
 * Enabled when EXPO_PUBLIC_DESIGN_MODE=1 — no real API / Privy / chain.
 */

import type {
  CommitCalldata,
  CurrentRoundResponse,
  DemoTradeResult,
  ExecuteTradeResult,
  FaucetResult,
  WalletPosition,
  WalletSnapshot,
} from "../api/client";

const DESIGN_ADDRESS = "0xDes1gn0000000000000000000000Hunch01";
const MARKET = "0xMarketMock0000000000000000000Hunch";
const COLLATERAL = "0xAusdMock00000000000000000000Hunch";
const ROUND_MS = 60_000;

type Store = {
  roundId: number;
  roundStartedAt: number;
  ausd: number;
  mon: number;
  positions: WalletPosition[];
  lastTx: number;
};

const store: Store = {
  roundId: 42,
  roundStartedAt: Date.now(),
  ausd: 1280.5,
  mon: 2.45,
  positions: [
    {
      roundId: "40",
      market: "0xMarketMock0000000000000000000Hu40",
      yes: "12.4",
      no: "0",
      status: "resolved",
      yesWins: true,
      redeemable: true,
      estimatedPayout: "18.20",
    },
    {
      roundId: "39",
      market: "0xMarketMock0000000000000000000Hu39",
      yes: "0",
      no: "8.1",
      status: "resolved",
      yesWins: true,
      redeemable: false,
      estimatedPayout: "0",
    },
    {
      roundId: "41",
      market: "0xMarketMock0000000000000000000Hu41",
      yes: "0",
      no: "15.0",
      status: "open",
      redeemable: false,
      estimatedPayout: "0",
    },
  ],
  lastTx: 1,
};

function delay(ms = 180) {
  return new Promise((r) => setTimeout(r, ms));
}

function nextTx() {
  store.lastTx += 1;
  return `0xmocktx${store.lastTx.toString(16).padStart(60, "0")}`;
}

function ensureLiveRound() {
  const elapsed = Date.now() - store.roundStartedAt;
  if (elapsed >= ROUND_MS) {
    // Resolve previous open positions for this round visually
    for (const p of store.positions) {
      if (p.roundId === String(store.roundId) && p.status === "open") {
        p.status = "resolved";
        p.yesWins = Number(p.yes) > 0;
        p.redeemable = Number(p.yes) > 0 || Number(p.no) > 0;
        if (p.redeemable && Number(p.yes) > 0) {
          p.estimatedPayout = (Number(p.yes) * 1.35).toFixed(2);
        } else if (p.redeemable && Number(p.no) > 0) {
          p.yesWins = false;
          p.estimatedPayout = (Number(p.no) * 1.35).toFixed(2);
        }
      }
    }
    store.roundId += 1;
    store.roundStartedAt = Date.now();
  }
}

function timeRemainingSec() {
  ensureLiveRound();
  const left = ROUND_MS - (Date.now() - store.roundStartedAt);
  return Math.max(0, left / 1000);
}

function strikeNow() {
  // Fake BTC ~ around 95k with tiny jitter for UI
  return String(Math.floor(95200 + Math.sin(Date.now() / 4000) * 40));
}

function snapshot(): WalletSnapshot {
  return {
    address: DESIGN_ADDRESS,
    ausd: store.ausd.toFixed(2),
    mon: store.mon.toFixed(3),
    roundCount: store.roundId,
    positions: [...store.positions].reverse(),
    explorer: `https://testnet.monadvision.com/address/${DESIGN_ADDRESS}`,
  };
}

export const mockApi = {
  async fetchCurrentRound(): Promise<CurrentRoundResponse> {
    await delay();
    const remaining = timeRemainingSec();
    return {
      round: {
        roundId: String(store.roundId),
        market: MARKET,
        strike: strikeNow(),
        expo: 0,
        startTime: Math.floor(store.roundStartedAt / 1000),
        expiry: Math.floor((store.roundStartedAt + ROUND_MS) / 1000),
        status: "open",
      },
      spot: { yes: "0.52", no: "0.48" },
      timeRemaining: remaining,
    };
  },

  async fetchRound(id: string) {
    await delay();
    const pos = store.positions.find((p) => p.roundId === id);
    if (pos?.status === "resolved") {
      return {
        round: {
          roundId: id,
          status: "resolved" as const,
          yesWins: pos.yesWins,
        },
      };
    }
    if (id === String(store.roundId)) {
      return { round: { roundId: id, status: "open" as const } };
    }
    return {
      round: {
        roundId: id,
        status: "resolved" as const,
        yesWins: true,
      },
    };
  },

  async fetchConfig() {
    await delay(80);
    return { chainId: 10143, duration: 60, vault: "0xVaultMock000000000000000000Hunch" };
  },

  async fetchDemoMe() {
    await delay();
    return snapshot();
  },

  async fetchWallet(_address: string) {
    await delay();
    return snapshot();
  },

  async walletFaucet(_address: string, amountAUSD = "1000"): Promise<FaucetResult> {
    await delay(400);
    if (store.ausd >= 250) {
      return {
        address: DESIGN_ADDRESS,
        ausd: store.ausd.toFixed(2),
        mon: store.mon.toFixed(3),
        alreadyFunded: true,
      };
    }
    const mint = Math.min(1000, Number(amountAUSD) || 1000);
    store.ausd += mint;
    store.mon = Math.max(store.mon, 0.05);
    return {
      address: DESIGN_ADDRESS,
      ausd: store.ausd.toFixed(2),
      mon: store.mon.toFixed(3),
      mintTx: nextTx(),
      monTx: nextTx(),
    };
  },

  async fetchCommitCalldata(side: string, amountAUSD: string): Promise<CommitCalldata> {
    await delay();
    return {
      chainId: 10143,
      market: MARKET,
      collateral: COLLATERAL,
      approve: { to: COLLATERAL, data: "0x", value: "0" },
      commit: {
        to: MARKET,
        data: "0x",
        value: "0",
        description: `mock commit ${side} ${amountAUSD}`,
      },
    };
  },

  async executeTrade(trader: string): Promise<ExecuteTradeResult> {
    await delay(300);
    return {
      mode: "design",
      intentId: "mock-intent",
      market: MARKET,
      trader,
      side: "YES",
      sideLabel: "UP",
      roundId: String(store.roundId),
      amountAUSD: "10",
      sharesOut: "18.5",
      yes: "18.5",
      no: "0",
      executeTx: nextTx(),
      spot: { yes: "0.54", no: "0.46" },
      explorer: `https://testnet.monadvision.com/tx/${nextTx()}`,
    };
  },

  async fetchRedeemCalldata(market?: string) {
    await delay();
    return {
      to: market || MARKET,
      data: "0x",
      value: "0",
      description: "mock redeem",
    };
  },

  async fetchQuote(side: "YES" | "NO", amountAUSD: string) {
    await delay(100);
    const amt = Number(amountAUSD) || 10;
    const shares = (amt * (side === "YES" ? 1.85 : 1.92)).toFixed(2);
    return {
      side,
      amountIn: amountAUSD,
      feeAUSD: (amt * 0.01).toFixed(2),
      sharesOut: shares,
      note: "design-mode quote",
    };
  },

  async demoTrade(side: "UP" | "DOWN", amountAUSD = "10"): Promise<DemoTradeResult> {
    await delay(450);
    ensureLiveRound();
    const amt = Number(amountAUSD) || 10;
    if (store.ausd < amt) throw new Error("Insufficient AUSD (design mock)");
    store.ausd -= amt;
    const shares = (amt * 1.88).toFixed(2);
    const yes = side === "UP" ? shares : "0";
    const no = side === "DOWN" ? shares : "0";
    const tx = nextTx();
    store.positions.push({
      roundId: String(store.roundId),
      market: MARKET,
      yes,
      no,
      status: "open",
      redeemable: false,
      estimatedPayout: "0",
    });
    return {
      mode: "design",
      trader: DESIGN_ADDRESS,
      roundId: String(store.roundId),
      market: MARKET,
      side,
      amountAUSD: String(amt),
      yes,
      no,
      executeTx: tx,
      spot: { yes: "0.53", no: "0.47" },
    };
  },

  async demoRedeem(roundId: string) {
    await delay(400);
    const pos = store.positions.find((p) => p.roundId === roundId && p.redeemable);
    if (!pos) throw new Error("Nothing to claim for this round (design mock)");
    const payout = Number(pos.estimatedPayout) || 0;
    store.ausd += payout;
    pos.redeemable = false;
    pos.estimatedPayout = "0";
    return {
      payout: payout.toFixed(2),
      tx: nextTx(),
      sideWon: pos.yesWins ? "UP" : "DOWN",
    };
  },

  async demoFaucet(amountAUSD = "1000") {
    return mockApi.walletFaucet(DESIGN_ADDRESS, amountAUSD);
  },
};

export const DESIGN_USER = {
  id: "design:designer@hunch.app",
  email: "designer@hunch.app",
  displayName: "Designer",
  address: DESIGN_ADDRESS,
  privy: false as const,
};
