import fs from "fs";
import path from "path";
import { ethers } from "hardhat";
import { MONAD_TESTNET } from "../config/addresses";
import { fetchLatestPriceUpdate } from "./lib/hermes";
import { pullPythOnchain } from "./lib/pythPull";

type Deployment = {
  factory: string;
  collateral: { address: string };
  btcUsdFeedId: string;
  pyth: string;
};

async function main() {
  const depPath = path.join(__dirname, "..", "deployments", "monad-testnet.json");
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8")) as Deployment;
  const [signer] = await ethers.getSigners();
  const amount = ethers.parseUnits(process.env.AMOUNT_AUSD || "50", 6);

  const ausd = await ethers.getContractAt(
    [
      "function approve(address,uint256) returns (bool)",
      "function balanceOf(address) view returns (uint256)",
    ],
    dep.collateral.address
  );
  const factory = await ethers.getContractAt("HunchFactory", dep.factory);
  const pyth = await ethers.getContractAt(
    [
      "function getUpdateFee(bytes[] updateData) view returns (uint256)",
      "function updatePriceFeeds(bytes[] updateData) payable",
      "function getPriceNoOlderThan(bytes32 id, uint256 age) view returns (int64 price, uint64 conf, int32 expo, uint publishTime)",
    ],
    dep.pyth
  );

  if (Number(await factory.defaultMaxPriceAge()) < 120) {
    await (await factory.setDefaults(60, 2, 120, 100, 2500, 2000)).wait();
    console.log("Updated defaultMaxPriceAge → 120s");
  }

  let roundId = await factory.roundCount();
  let marketAddr = roundId > 0n ? await factory.rounds(roundId) : ethers.ZeroAddress;
  let market =
    marketAddr !== ethers.ZeroAddress
      ? await ethers.getContractAt("HunchMarket", marketAddr)
      : null;

  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  const needNew =
    !market ||
    (await market.status()) !== 0n ||
    Number(await market.expiry()) <= now + 5;

  if (needNew) {
    console.log("Opening fresh round (split Pyth pull + create)...");
    const seed = ethers.parseUnits(process.env.SEED_AUSD || "1000", 6);
    await (await ausd.approve(dep.factory, seed)).wait();

    const pulled = await pullPythOnchain(pyth, dep.btcUsdFeedId, signer);
    console.log("Pyth updated", pulled.txHash, "publishTime", pulled.update.publishTime);

    // Empty updateData — price already on-chain from previous tx
    const estimated = await factory.createAndOpen.estimateGas(dep.btcUsdFeedId, seed, [], {
      value: 0,
    });
    const gasLimit = estimated + 500_000n;
    console.log("createAndOpen gasLimit", gasLimit.toString(), "(est", estimated.toString(), ")");

    const tx = await factory.createAndOpen(dep.btcUsdFeedId, seed, [], {
      value: 0,
      gasLimit,
    });
    console.log("createAndOpen tx", tx.hash);
    await tx.wait();

    roundId = await factory.roundCount();
    marketAddr = await factory.rounds(roundId);
    market = await ethers.getContractAt("HunchMarket", marketAddr);
    console.log("New market:", marketAddr);
  }

  const now2 = (await ethers.provider.getBlock("latest"))!.timestamp;
  console.log("Trading YES on", marketAddr);
  console.log("Strike:", (await market!.strikePrice()).toString());
  console.log("Expiry in", Number(await market!.expiry()) - now2, "sec");

  await (await ausd.approve(marketAddr, amount)).wait();
  const commitTx = await market!.commitBuy(0, amount, 0);
  await commitTx.wait();
  const intentId = (await market!.nextIntentId()) - 1n;
  console.log("Committed intent", intentId.toString(), "tx", commitTx.hash);

  const delay = Number(await market!.delayBlocks());
  console.log("Waiting", delay, "blocks...");
  const target = (await ethers.provider.getBlockNumber()) + delay;
  while ((await ethers.provider.getBlockNumber()) < target) {
    await new Promise((r) => setTimeout(r, 400));
  }

  // Refresh oracle in separate tx, then execute with empty payload
  const pulled = await pullPythOnchain(pyth, dep.btcUsdFeedId, signer, 5_000_000n);
  console.log("Pyth refreshed for execute", pulled.txHash);

  const execEstimated = await market!.executeBuy.estimateGas(intentId, [], { value: 0 });
  const execTx = await market!.executeBuy(intentId, [], {
    value: 0,
    gasLimit: execEstimated + 300_000n,
  });
  await execTx.wait();

  const yesBal = await market!.yesBalances(signer.address);
  const [yesWad, noWad] = await market!.spotPrices();

  console.log(
    JSON.stringify(
      {
        roundId: roundId.toString(),
        market: marketAddr,
        intentId: intentId.toString(),
        side: "YES",
        amountAUSD: ethers.formatUnits(amount, 6),
        yesShares: ethers.formatUnits(yesBal, 6),
        spotYes: ethers.formatUnits(yesWad, 18),
        spotNo: ethers.formatUnits(noWad, 18),
        commitTx: commitTx.hash,
        executeTx: execTx.hash,
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
