import { expect } from "chai";
import { ethers } from "hardhat";
import { time, mine } from "@nomicfoundation/hardhat-network-helpers";
import {
  AUSD,
  BTC_USD_FEED,
  commitAndExecute,
  deployHunchFixture,
  encodePythUpdate,
  openRound,
} from "../helpers";

/**
 * Full product loop:
 * create round → commit/execute YES & NO → warp 60s → resolve via Pyth → redeem winners
 */
describe("Hunch E2E", () => {
  it("runs a full 60s UP hunch round end-to-end", async () => {
    const { lp, alice, bob, ausd, pyth, factory }: any = await deployHunchFixture();

    // ── 1. Open round at BTC = 100_000 ──────────────────────────────────────
    const strike = 100_000_00000000n; // expo -8
    const { market }: any = await openRound(factory, ausd, pyth, lp, {
      seed: AUSD(10_000),
      price: strike,
    });

    expect(await market.strikePrice()).to.equal(strike);
    expect(await market.duration()).to.equal(60n);
    expect(await market.status()).to.equal(0n); // Open

    const aliceBefore = await ausd.balanceOf(alice.address);
    const bobBefore = await ausd.balanceOf(bob.address);

    // ── 2. Alice hunches UP (YES), Bob hunches DOWN (NO) ────────────────────
    await ausd.connect(alice).approve(await market.getAddress(), AUSD(500));
    await ausd.connect(bob).approve(await market.getAddress(), AUSD(500));

    await commitAndExecute(market, ausd, pyth, alice, 0, AUSD(200), strike);
    await commitAndExecute(market, ausd, pyth, bob, 1, AUSD(150), strike);

    const aliceYes = await market.yesBalances(alice.address);
    const bobNo = await market.noBalances(bob.address);
    expect(aliceYes).to.be.gt(0n);
    expect(bobNo).to.be.gt(0n);

    // Delay must be enforced
    await ausd.connect(alice).approve(await market.getAddress(), AUSD(10));
    await market.connect(alice).commitBuy(0, AUSD(10), 0n);
    const intentId = (await market.nextIntentId()) - 1n;
    await expect(market.connect(alice).executeBuy(intentId, [])).to.be.revertedWithCustomError(
      market,
      "DelayPending"
    );
    await mine(Number(await market.delayBlocks()));
    // still need fresh pyth for dynamic fee path
    const t = await time.latest();
    const upd = encodePythUpdate(BTC_USD_FEED, strike, 50_000000n, -8, t);
    const fee = await pyth.getUpdateFee([upd]);
    await market.connect(alice).executeBuy(intentId, [upd], { value: fee });

    // ── 3. Early exit: Bob dumps half his NO before expiry ──────────────────
    const half = bobNo / 2n;
    const bobMid = await ausd.balanceOf(bob.address);
    await market.connect(bob).earlyExit(1, half, 0n);
    expect(await ausd.balanceOf(bob.address)).to.be.gt(bobMid);
    expect(await market.noBalances(bob.address)).to.equal(bobNo - half);

    // ── 4. Warp past 60s, resolve UP (price above strike) ───────────────────
    await time.increaseTo((await market.expiry()) + 1n);

    const settlePrice = 101_500_00000000n; // +1.5%
    const expiry = await market.expiry();
    // publishTime must land in [expiry, expiry+2]
    const settleUpdate = encodePythUpdate(BTC_USD_FEED, settlePrice, 80_000000n, -8, Number(expiry));
    const settleFee = await pyth.getUpdateFee([settleUpdate]);

    await market.resolve([settleUpdate], { value: settleFee });
    expect(await market.status()).to.equal(1n); // Resolved
    expect(await market.yesWins()).to.equal(true);
    expect(await market.settlementPrice()).to.equal(settlePrice);

    // ── 5. Redeem: Alice (YES) paid, Bob (remaining NO) gets nothing ───────
    const aliceYesFinal = await market.yesBalances(alice.address);
    await market.connect(alice).redeem();
    expect(await market.yesBalances(alice.address)).to.equal(0n);
    expect(await ausd.balanceOf(alice.address)).to.equal(aliceBefore - AUSD(200) - AUSD(10) + aliceYesFinal);

    // Bob still holds losing NO — redeem should pull 0 / revert
    await expect(market.connect(bob).redeem()).to.be.reverted;

    // Trading blocked after resolve
    await expect(market.connect(alice).commitBuy(0, AUSD(1), 0n)).to.be.revertedWithCustomError(
      market,
      "RoundNotOpen"
    );
  });

  it("DOWN side wins when settlement < strike", async () => {
    const { lp, alice, bob, ausd, pyth, factory }: any = await deployHunchFixture();
    const strike = 100_000_00000000n;
    const { market }: any = await openRound(factory, ausd, pyth, lp, { price: strike });

    await ausd.connect(alice).approve(await market.getAddress(), AUSD(100));
    await ausd.connect(bob).approve(await market.getAddress(), AUSD(100));
    await commitAndExecute(market, ausd, pyth, alice, 0, AUSD(100), strike); // YES
    await commitAndExecute(market, ausd, pyth, bob, 1, AUSD(100), strike); // NO

    await time.increaseTo((await market.expiry()) + 1n);
    const expiry = await market.expiry();
    const down = 99_000_00000000n;
    const update = encodePythUpdate(BTC_USD_FEED, down, 50_000000n, -8, Number(expiry));
    const fee = await pyth.getUpdateFee([update]);
    await market.resolve([update], { value: fee });

    expect(await market.yesWins()).to.equal(false);

    const bobNo = await market.noBalances(bob.address);
    const bobBefore = await ausd.balanceOf(bob.address);
    await market.connect(bob).redeem();
    expect(await ausd.balanceOf(bob.address)).to.equal(bobBefore + bobNo);

    await expect(market.connect(alice).redeem()).to.be.reverted;
  });

  it("rejects stale oracle on open", async () => {
    const { lp, ausd, pyth, factory }: any = await deployHunchFixture();
    const staleTime = (await time.latest()) - 60;
    await pyth.pushPrice(BTC_USD_FEED, 100_000_00000000n, 1n, -8, staleTime);

    const update = encodePythUpdate(BTC_USD_FEED, 100_000_00000000n, 1n, -8, staleTime);
    // pushPrice already set stale; updatePriceFeeds will rewrite same stale time
    // open calls update then getPriceNoOlderThan(3) → should revert PriceTooOld
    await ausd.connect(lp).approve(await factory.getAddress(), AUSD(1000));
    // Actually update in open sets publishTime from payload (stale). Then getPriceNoOlderThan fails.
    const fee = await pyth.getUpdateFee([update]);
    await expect(
      factory.connect(lp).createAndOpen(BTC_USD_FEED, AUSD(1000), [update], { value: fee })
    ).to.be.reverted;
  });
});
