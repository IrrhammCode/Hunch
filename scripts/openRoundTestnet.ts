import fs from "fs";
import path from "path";
import { ethers } from "hardhat";
import { MONAD_TESTNET } from "../config/addresses";
import { pullPythOnchain } from "./lib/pythPull";

type Deployment = {
  factory: string;
  collateral: { address: string };
  btcUsdFeedId: string;
  pyth: string;
};

async function main() {
  const depPath = path.join(__dirname, "..", "deployments", "monad-testnet.json");
  if (!fs.existsSync(depPath)) {
    throw new Error("Missing deployments/monad-testnet.json — run deployMonadTestnet.ts first");
  }
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8")) as Deployment;
  const [signer] = await ethers.getSigners();
  const seed = ethers.parseUnits(process.env.SEED_AUSD || "1000", 6);

  const ausd = await ethers.getContractAt(
    ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"],
    dep.collateral.address
  );
  const factory = await ethers.getContractAt("HunchFactory", dep.factory);
  const pyth = await ethers.getContractAt(
    [
      "function getUpdateFee(bytes[] updateData) view returns (uint256)",
      "function updatePriceFeeds(bytes[] updateData) payable",
    ],
    dep.pyth
  );

  const bal = await ausd.balanceOf(signer.address);
  if (bal < seed) throw new Error(`Need ${seed} AUSD, have ${bal}.`);

  await (await ausd.approve(dep.factory, seed)).wait();

  const pulled = await pullPythOnchain(pyth, dep.btcUsdFeedId || MONAD_TESTNET.btcUsdFeedId, signer);
  console.log("Pyth updated", pulled.txHash, "price", pulled.update.price.toString());

  const estimated = await factory.createAndOpen.estimateGas(dep.btcUsdFeedId, seed, [], { value: 0 });
  const gasLimit = estimated + 500_000n;

  const tx = await factory.createAndOpen(dep.btcUsdFeedId, seed, [], { value: 0, gasLimit });
  console.log("createAndOpen tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("confirmed in block", receipt?.blockNumber);

  const roundId = await factory.roundCount();
  const market = await factory.rounds(roundId);
  const m = await ethers.getContractAt("HunchMarket", market);

  console.log(
    JSON.stringify(
      {
        roundId: roundId.toString(),
        market,
        strike: (await m.strikePrice()).toString(),
        expo: Number(await m.strikeExpo()),
        startTime: Number(await m.startTime()),
        expiry: Number(await m.expiry()),
        explorer: `${MONAD_TESTNET.explorer}/address/${market}`,
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
