/**
 * Simulate real Hunch/Perpl interactions on Tenderly before live testnet txs.
 * No MockAUSD.mint — Agora faucet requestFunds only.
 *
 * Usage:
 *   npx ts-node scripts/tenderlySimulate.ts
 *   npx ts-node scripts/tenderlySimulate.ts agora-faucet [0xAddr]
 *   npx ts-node scripts/tenderlySimulate.ts commit
 *
 * Env: TENDERLY_* (real keys only), MONAD_RPC_URL (Quicknode)
 */
import { ethers } from "ethers";
import { loadEnv, loadDeployment, getProvider, getWallet, marketContract, ausdContract } from "../src/shared/chain";
import { simulateOnTenderly } from "../src/shared/tenderly";
import { perkStatus, tenderlyConfigured } from "../src/shared/sponsors";
import { feedIdFor } from "../src/shared/markets";
import { factoryContract } from "../src/shared/chain";

loadEnv();

async function main() {
  const mode = (process.argv[2] || "help").toLowerCase();
  const arg = process.argv[3];
  const dep = loadDeployment();
  const wallet = getWallet();
  const provider = getProvider();

  console.log("[tenderly]", perkStatus());
  if (!tenderlyConfigured() && mode !== "help") {
    console.error("Tenderly keys not ready — waiting on perk. No mock fallback.");
    process.exit(1);
  }

  if (mode === "help") {
    console.log(`
Commands:
  agora-faucet [addr]  Simulate Agora faucet requestFunds (not MockAUSD mint)
  commit               Simulate AUSD.approve + commitBuy on current BTC market
  execute              Simulate executeBuy on latest open intent

Real Tenderly API only. Does NOT send live txs.
`);
    return;
  }

  if (mode === "agora-faucet" || mode === "faucet" || mode === "approve") {
    const target = ethers.isAddress(arg || "") ? arg : wallet.address;
    const faucetAddr =
      (dep.collateral as any).faucet || "0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C";
    const iface = new ethers.Interface([
      "function requestFunds(address recipient) external returns (bool)",
    ]);
    const data = iface.encodeFunctionData("requestFunds", [target]);
    const sim = await simulateOnTenderly({
      networkId: dep.chainId,
      from: wallet.address,
      to: faucetAddr,
      data,
      save: true,
    });
    console.log(JSON.stringify(sim, null, 2));
    return;
  }

  if (mode === "commit") {
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
