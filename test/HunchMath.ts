import { expect } from "chai";
import { ethers } from "hardhat";

describe("HunchMath", () => {
  async function harness() {
    return (await (await ethers.getContractFactory("HunchMathHarness")).deploy()) as any;
  }

  it("keeps k invariant on buyYes", async () => {
    const m = await harness();
    const y = 10_000n * 10n ** 6n;
    const n = 10_000n * 10n ** 6n;
    const k = y * n;
    const amount = 100n * 10n ** 6n;

    const [shares, newY, newN] = await m.buyYes(y, n, amount);
    // x*y=k with integer division: product may be slightly below k
    expect(newY * newN).to.be.lte(k);
    expect(k - BigInt(newY) * BigInt(newN)).to.be.lt(BigInt(newN));
    expect(shares).to.be.gt(amount);
    // Balanced pool: buying YES should leave YES more expensive
    const yesBefore = await m.spotYes(y, n);
    const yesAfter = await m.spotYes(newY, newN);
    expect(yesAfter).to.be.gt(yesBefore);
  });

  it("buyNo is symmetric", async () => {
    const m = await harness();
    const y = 5_000n * 10n ** 6n;
    const n = 5_000n * 10n ** 6n;
    const amount = 50n * 10n ** 6n;

    const [sharesYes] = await m.buyYes(y, n, amount);
    const [sharesNo] = await m.buyNo(y, n, amount);
    expect(sharesYes).to.equal(sharesNo);
  });

  it("rejects zero and empty pool", async () => {
    const m = await harness();
    await expect(m.buyYes(100n, 100n, 0n)).to.be.reverted;
    await expect(m.buyYes(0n, 100n, 10n)).to.be.reverted;
  });
});
