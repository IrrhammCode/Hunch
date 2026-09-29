import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { AUSD, BTC_USD_FEED, deployHunchFixture, encodePythUpdate, openRound } from "./helpers";

describe("HunchVault LP", () => {
  it("deposits, seeds via factory path, claims residual after resolve", async () => {
    const { lp, alice, ausd, pyth, factory, feeRecipient, deployer }: any = await deployHunchFixture();

    const vault: any = await (
      await ethers.getContractFactory("HunchVault")
    ).deploy(await ausd.getAddress(), await factory.getAddress(), AUSD(1_000));
    await vault.waitForDeployment();

    await ausd.connect(lp).approve(await vault.getAddress(), AUSD(10_000));
    await vault.connect(lp).deposit(AUSD(10_000));
    expect(await vault.sharesOf(lp.address)).to.equal(AUSD(10_000));

    // Keeper = deployer (owner). Pull price then vault.seedRound
    const price = 100_000_00000000n;
    const t = await time.latest();
    await pyth.pushPrice(BTC_USD_FEED, price, 50_000000n, -8, t);
    const update = encodePythUpdate(BTC_USD_FEED, price, 50_000000n, -8, t);
    const fee = await pyth.getUpdateFee([update]);
    await pyth.updatePriceFeeds([update], { value: fee });

    await vault.seedRound(BTC_USD_FEED);
    const roundId = await factory.roundCount();
    const marketAddr = await factory.rounds(roundId);
    const market: any = await ethers.getContractAt("HunchMarket", marketAddr);
    expect(await market.seedProvider()).to.equal(await vault.getAddress());

    await ausd.connect(alice).approve(marketAddr, AUSD(100));
    // delay 2 blocks path via helpers would work; use commit+mine+execute
    const { mine } = await import("@nomicfoundation/hardhat-network-helpers");
    await market.connect(alice).commitBuy(0, AUSD(100), 0);
    await mine(2);
    const t2 = await time.latest();
    const u2 = encodePythUpdate(BTC_USD_FEED, price, 50_000000n, -8, t2);
    await market.connect(alice).executeBuy(1, [u2], { value: await pyth.getUpdateFee([u2]) });

    await time.increaseTo((await market.expiry()) + 1n);
    const expiry = Number(await market.expiry());
    const settle = encodePythUpdate(BTC_USD_FEED, 99_000_00000000n, 50_000000n, -8, expiry);
    await market.resolve([settle], { value: await pyth.getUpdateFee([settle]) });
    // NO wins — alice YES loses; residual remains for vault
    expect(await market.yesWins()).to.equal(false);

    await time.increase(31);
    const before = await ausd.balanceOf(await vault.getAddress());
    await vault.claimResidual(marketAddr);
    expect(await ausd.balanceOf(await vault.getAddress())).to.be.gt(before);
  });
});
