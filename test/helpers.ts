import { expect } from "chai";
import { ethers } from "hardhat";
import { time, mine } from "@nomicfoundation/hardhat-network-helpers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { Contract } from "ethers";

/** BTC/USD feed id used in tests (arbitrary but fixed). */
export const BTC_USD_FEED = ethers.id("Crypto.BTC/USD");

export const AUSD = (n: string | number) => ethers.parseUnits(String(n), 6);

export function encodePythUpdate(
  feedId: string,
  price: bigint,
  conf: bigint,
  expo: number,
  publishTime: number
): string {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "int64", "uint64", "int32", "uint256"],
    [feedId, price, conf, expo, publishTime]
  );
}

export async function deployHunchFixture() {
  const [deployer, lp, alice, bob, feeRecipient] = await ethers.getSigners();

  const ausd = await (await ethers.getContractFactory("MockAUSD")).deploy();
  const pyth = await (await ethers.getContractFactory("MockPyth")).deploy();
  const factory = await (
    await ethers.getContractFactory("HunchFactory")
  ).deploy(await ausd.getAddress(), await pyth.getAddress(), feeRecipient.address);

  for (const who of [lp, alice, bob, deployer]) {
    await ausd.mint(who.address, AUSD(1_000_000));
  }

  await ausd.connect(lp).approve(await factory.getAddress(), ethers.MaxUint256);
  await ausd.connect(alice).approve(await factory.getAddress(), ethers.MaxUint256);

  return { deployer, lp, alice, bob, feeRecipient, ausd, pyth, factory };
}

export async function openRound(
  factory: Contract,
  ausd: Contract,
  pyth: Contract,
  lp: HardhatEthersSigner,
  opts?: { seed?: bigint; price?: bigint; conf?: bigint }
) {
  const seed = opts?.seed ?? AUSD(10_000);
  const price = opts?.price ?? 100_000_00000000n;
  const conf = opts?.conf ?? 50_000000n;
  const expo = -8;
  const publishTime = await time.latest();

  await pyth.pushPrice(BTC_USD_FEED, price, conf, expo, publishTime);

  const update = encodePythUpdate(BTC_USD_FEED, price, conf, expo, publishTime);
  const fee = await pyth.getUpdateFee([update]);

  await ausd.connect(lp).approve(await factory.getAddress(), seed);
  await (await factory.connect(lp).createAndOpen(BTC_USD_FEED, seed, [update], { value: fee })).wait();

  const roundId = await factory.roundCount();
  const marketAddr = await factory.rounds(roundId);
  const market = await ethers.getContractAt("HunchMarket", marketAddr);

  return { market, roundId, seed, strike: price, publishTime };
}

export async function commitAndExecute(
  market: Contract,
  ausd: Contract,
  pyth: Contract,
  trader: HardhatEthersSigner,
  side: 0 | 1,
  amount: bigint,
  price: bigint,
  conf: bigint = 50_000000n
) {
  await ausd.connect(trader).approve(await market.getAddress(), amount);
  const tx = await market.connect(trader).commitBuy(side, amount, 0n);
  const receipt = await tx.wait();
  const parsed = receipt!.logs
    .map((l: any) => {
      try {
        return market.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e: any) => e?.name === "IntentCommitted");
  const intentId = parsed!.args.intentId as bigint;

  const delay = await market.delayBlocks();
  if (delay > 0n) {
    await mine(Number(delay));
  }

  const publishTime = await time.latest();
  const update = encodePythUpdate(BTC_USD_FEED, price, conf, -8, publishTime);
  const fee = await pyth.getUpdateFee([update]);

  await (await market.connect(trader).executeBuy(intentId, [update], { value: fee })).wait();

  return { intentId };
}

// silence unused import in helpers consumers that expect chai
void expect;
