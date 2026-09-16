import { ethers } from "hardhat";
import { time, mine } from "@nomicfoundation/hardhat-network-helpers";

const FEED = ethers.id("Crypto.BTC/USD");
const AUSD = (n: number) => ethers.parseUnits(String(n), 6);

function encode(price: bigint, conf: bigint, publishTime: number) {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "int64", "uint64", "int32", "uint256"],
    [FEED, price, conf, -8, publishTime]
  );
}

/**
 * Scripted demo of one full round on a fresh local deploy.
 * npx hardhat run scripts/simulateRound.ts
 */
async function main() {
  const [deployer, lp, alice, bob, feeRecipient] = await ethers.getSigners();

  const ausd = await (await ethers.getContractFactory("MockAUSD")).deploy();
  const pyth = await (await ethers.getContractFactory("MockPyth")).deploy();
  const factory = await (
    await ethers.getContractFactory("HunchFactory")
  ).deploy(await ausd.getAddress(), await pyth.getAddress(), feeRecipient.address);

  for (const s of [lp, alice, bob]) {
    await ausd.mint(s.address, AUSD(100_000));
    await ausd.connect(s).approve(await factory.getAddress(), ethers.MaxUint256);
  }

  const strike = 100_000_00000000n;
  const t0 = await time.latest();
  await pyth.pushPrice(FEED, strike, 50_000000n, -8, t0);
  const openUpdate = encode(strike, 50_000000n, t0);
  const openFee = await pyth.getUpdateFee([openUpdate]);

  await ausd.connect(lp).approve(await factory.getAddress(), AUSD(10_000));
  await factory.connect(lp).createAndOpen(FEED, AUSD(10_000), [openUpdate], { value: openFee });

  const market = await ethers.getContractAt("HunchMarket", await factory.rounds(1));
  console.log("Market:", await market.getAddress());
  console.log("Strike:", (await market.strikePrice()).toString());

  // Alice YES
  await ausd.connect(alice).approve(await market.getAddress(), AUSD(250));
  await market.connect(alice).commitBuy(0, AUSD(250), 0);
  await mine(2);
  let t = await time.latest();
  let u = encode(strike, 50_000000n, t);
  await market.connect(alice).executeBuy(1, [u], { value: await pyth.getUpdateFee([u]) });

  // Bob NO
  await ausd.connect(bob).approve(await market.getAddress(), AUSD(250));
  await market.connect(bob).commitBuy(1, AUSD(250), 0);
  await mine(2);
  t = await time.latest();
  u = encode(strike, 50_000000n, t);
  await market.connect(bob).executeBuy(2, [u], { value: await pyth.getUpdateFee([u]) });

  console.log("Alice YES shares:", (await market.yesBalances(alice.address)).toString());
  console.log("Bob NO shares:", (await market.noBalances(bob.address)).toString());
  const [yesWad, noWad] = await market.spotPrices();
  console.log("Spot YES:", ethers.formatUnits(yesWad, 18));
  console.log("Spot NO:", ethers.formatUnits(noWad, 18));

  await time.increaseTo((await market.expiry()) + 1n);
  const expiry = Number(await market.expiry());
  const settle = encode(101_250_00000000n, 60_000000n, expiry);
  await market.resolve([settle], { value: await pyth.getUpdateFee([settle]) });

  console.log("YES wins:", await market.yesWins());
  const before = await ausd.balanceOf(alice.address);
  await market.connect(alice).redeem();
  const after = await ausd.balanceOf(alice.address);
  console.log("Alice payout (AUSD):", ethers.formatUnits(after - before, 6));
  console.log("E2E simulateRound OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
