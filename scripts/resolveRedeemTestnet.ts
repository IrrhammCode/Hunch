import fs from "fs";
import path from "path";
import { ethers } from "hardhat";
import { MONAD_TESTNET } from "../config/addresses";
import { fetchPriceUpdateAt } from "./lib/hermes";

type Deployment = {
  factory: string;
  collateral: { address: string };
  btcUsdFeedId: string;
  pyth: string;
};

/**
 * Wait for expiry → resolve with Hermes historical update → redeem if winner.
 *
 *   ROUND_ID=1 npx hardhat run scripts/resolveRedeemTestnet.ts --network monadTestnet
 */
async function main() {
  const depPath = path.join(__dirname, "..", "deployments", "monad-testnet.json");
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8")) as Deployment;
  const [signer] = await ethers.getSigners();

  const factory = await ethers.getContractAt("HunchFactory", dep.factory);
  const roundId = BigInt(process.env.ROUND_ID || (await factory.roundCount()).toString());
  const marketAddr = await factory.rounds(roundId);
  if (marketAddr === ethers.ZeroAddress) throw new Error(`No market for round ${roundId}`);

  const market = await ethers.getContractAt("HunchMarket", marketAddr);
  const ausd = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)"],
    dep.collateral.address
  );
  const pyth = await ethers.getContractAt(
    ["function getUpdateFee(bytes[] updateData) view returns (uint256)"],
    dep.pyth
  );

  const expiry = Number(await market.expiry());
  const strike = await market.strikePrice();
  console.log({
    roundId: roundId.toString(),
    market: marketAddr,
    strike: strike.toString(),
    expiry,
    status: Number(await market.status()),
  });

  // Wait until chain time >= expiry
  for (;;) {
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    if (now >= expiry) break;
    const wait = expiry - now;
    console.log(`Waiting for expiry… ${wait}s left`);
    await new Promise((r) => setTimeout(r, Math.min(wait, 5) * 1000));
  }

  if ((await market.status()) === 0n) {
    console.log("Fetching Hermes update at expiry", expiry);
    const update = await fetchPriceUpdateAt(dep.btcUsdFeedId, expiry, 5);
    console.log("Settlement candidate:", {
      price: update.price.toString(),
      publishTime: update.publishTime,
      inWindow: update.publishTime >= expiry && update.publishTime <= expiry + 5,
    });

    if (update.publishTime < expiry || update.publishTime > expiry + 5) {
      throw new Error(
        `Hermes publishTime ${update.publishTime} outside [${expiry}, ${expiry + 5}]`
      );
    }

    const fee = await pyth.getUpdateFee(update.binaryUpdates);
    const tx = await market.resolve(update.binaryUpdates, { value: fee });
    console.log("resolve tx:", tx.hash);
    await tx.wait();
  } else {
    console.log("Already resolved");
  }

  const yesWins = await market.yesWins();
  const settlement = await market.settlementPrice();
  const yesBal = await market.yesBalances(signer.address);
  const noBal = await market.noBalances(signer.address);

  console.log({
    yesWins,
    settlement: settlement.toString(),
    yesShares: ethers.formatUnits(yesBal, 6),
    noShares: ethers.formatUnits(noBal, 6),
  });

  const winningShares = yesWins ? yesBal : noBal;
  if (winningShares === 0n) {
    console.log("No winning shares to redeem (lost or already redeemed).");
    return;
  }

  const before = await ausd.balanceOf(signer.address);
  const redeemTx = await market.redeem();
  console.log("redeem tx:", redeemTx.hash);
  await redeemTx.wait();
  const after = await ausd.balanceOf(signer.address);

  console.log(
    JSON.stringify(
      {
        roundId: roundId.toString(),
        market: marketAddr,
        yesWins,
        settlement: settlement.toString(),
        redeemedAUSD: ethers.formatUnits(after - before, 6),
        explorer: `${MONAD_TESTNET.explorer}/address/${marketAddr}`,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
