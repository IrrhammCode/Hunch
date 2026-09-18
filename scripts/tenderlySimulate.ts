/**
 * Simulate HunchMarket interactions on Tenderly before live testnet txs.
 *
 * Usage:
 *   npx ts-node scripts/tenderlySimulate.ts
 *   npx ts-node scripts/tenderlySimulate.ts commit
 *   npx ts-node scripts/tenderlySimulate.ts approve 0xYourWallet
 *
 * Env: TENDERLY_ACCOUNT, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY
 *      MONAD_RPC_URL (prefer Quicknode)
 */
import { ethers } from "ethers";
import { loadEnv, loadDeployment, getProvider, getWallet, marketContract, ausdContract } from "../src/shared/chain";
import { simulateOnTenderly } from "../src/shared/tenderly";
import { perkStatus } from "../src/shared/sponsors";
import { feedIdFor } from "../src/shared/markets";

loadEnv();

async function main() {
  const mode = (process.argv[2] || "help").toLowerCase();
  const arg = process.argv[3];
  const dep = loadDeployment();
  const wallet = getWallet();
  const provider = getProvider();

  console.log("[tenderly]", perkStatus());
  if (mode === "help") {
    console.log(`
Commands:
  approve [addr]   Simulate MockAUSD mint 100 AUSD to addr (default deployer)
  commit           Simulate approve + note commitBuy target on current market
  execute          Simulate executeBuy on latest open intent (calldata dry-run)

Requires Tenderly env keys. Does NOT send live txs.
`);
    return;
  }

  if (mode === "approve" || mode === "faucet") {
    const target = ethers.isAddress(arg || "") ? arg : wallet.address;
    const data = ausdContract(provider).interface.encodeFunctionData("mint", [
      target,
      ethers.parseUnits("100", 6),
    ]);
    const sim = await simulateOnTenderly({
      networkId: dep.chainId,
      from: wallet.address,
      to: dep.collateral.address,
      data,
      save: true,
    });
    console.log(JSON.stringify(sim, null, 2));
    return;
  }

  if (mode === "commit") {
    const factoryAbi = [
      "function latestRoundByFeed(bytes32) view returns (uint256)",
      "function rounds(uint256) view returns (address)",
    ];
    const { factoryContract } = await import("../src/shared/chain");
    const factory = factoryContract(provider, dep);
    const feed = feedIdFor("BTC");
    const idBn = (await factory.latestRoundByFeed(feed)) as bigint;
    const market = (idBn && idBn > 0n ? await factory.rounds(idBn) : await factory.rounds(await factory.roundCount())) as string;
    const amount = ethers.parseUnits("10", 6);
    const approveData = ausdContract(provider).interface.encodeFunctionData("approve", [market, amount]);
    const m = marketContract(market, provider);
    const commitData = m.interface.encodeFunctionData("commitBuy", [0, amount, 0n]);

    console.log("[tenderly] simulate AUSD.approve →", market);
    const s1 = await simulateOnTenderly({
      networkId: dep.chainId,
      from: wallet.address,
      to: dep.collateral.address,
      data: approveData,
    });
    console.log("approve", s1.ok ? "PASS" : "FAIL", s1.tenderlyUrl || s1.error);

    console.log("[tenderly] simulate commitBuy →", market);
    const s2 = await simulateOnTenderly({
      networkId: dep.chainId,
      from: wallet.address,
      to: market,
      data: commitData,
    });
    console.log("commit", s2.ok ? "PASS" : "FAIL", s2.tenderlyUrl || s2.error);
    return;
  }

  if (mode === "execute") {
    const factory = factoryContract(provider, dep);
    const feed = feedIdFor(arg && arg.toUpperCase() ? arg.toUpperCase() : "BTC");
    const idBn = (await factory.latestRoundByFeed(feed)) as bigint;
    if (!idBn || idBn === 0n) {
      console.error("No round for feed — open one with keeper first");
      return;
    }
    const marketAddr = (await factory.rounds(idBn)) as string;
    const m = marketContract(marketAddr, provider);
    const next = (await m.nextIntentId()) as bigint;
    const intentId = next > 0n ? next - 1n : 1n;
    const data = m.interface.encodeFunctionData("executeBuy", [intentId, [] as string[]]);
    console.log("[tenderly] simulate executeBuy intent", intentId.toString(), marketAddr);
    const sim = await simulateOnTenderly({
      networkId: dep.chainId,
      from: wallet.address,
      to: marketAddr,
      data,
    });
    console.log(JSON.stringify({ ok: sim.ok, url: sim.tenderlyUrl, error: sim.error }, null, 2));
    return;
  }

  console.error("Unknown command", mode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
