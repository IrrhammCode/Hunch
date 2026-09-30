/**
 * E2E smoke against live Hunch stack (API + chain + Perpl).
 * Usage: npm run e2e:smoke
 */
import { loadEnv, loadDeployment, getProvider, getWallet } from "../src/shared/chain";
import { fetchLatestPrice, fetchPriceHistory } from "../src/api/price";
import { listMarketsBoard } from "../src/api/markets";
import { listPerplMarkets, getUserPerplAccount } from "../src/api/perpl";
import { buildPerplRisk } from "../src/api/perplRisk";
import { walletSnapshot } from "../src/api/wallet";
import { perkStatus } from "../src/shared/sponsors";
import { perplAuthConfigured } from "../src/shared/perplAuth";
import { ethers } from "ethers";

loadEnv();

const results: { name: string; ok: boolean; detail: string }[] = [];
function rec(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
}

async function main() {
  console.log("=== Hunch E2E smoke (live) ===");
  const wallet = getWallet();
  const addr = wallet.address;
  const p = perkStatus() as any;
  rec("sponsors.quicknode", p.quicknode === "configured", String(p.quicknode));
  rec("sponsors.perplKeys", p.perplKeys === "configured", String(p.perplKeys));
  rec("perplAuth", perplAuthConfigured(), perplAuthConfigured() ? "trade keys ok" : "missing");

  try {
    const btc = await fetchLatestPrice("BTC");
    rec("price.BTC", btc.price > 0, String(btc.price));
    const eth = await fetchLatestPrice("ETH");
    rec("price.ETH", eth.price > 0, String(eth.price));
    const hist = await fetchPriceHistory("BTC", 1, 30);
    rec(
      "price.history",
      (hist.bars?.length || 0) >= 10,
      `bars=${hist.bars?.length} src=${hist.source}`,
    );
  } catch (e: any) {
    rec("price", false, e.message);
  }

  try {
    const board = await listMarketsBoard("monad");
    rec(
      "markets.board",
      board.markets.length >= 3,
      `n=${board.markets.length} ${board.markets.map((m: any) => m.symbol).join(",")}`,
    );
  } catch (e: any) {
    rec("markets.board", false, e.message);
  }

  try {
    const { markets } = await listPerplMarkets();
    rec("perpl.markets", markets.length >= 8, `n=${markets.length}`);
    const acct = await getUserPerplAccount(addr);
    rec("perpl.account", acct.accountId != null, `id=${acct.accountId} auth=${acct.authConfigured}`);
    const r = await buildPerplRisk(addr);
    rec(
      "perpl.risk",
      r.collateralAUSD > 0,
      `collat=${r.collateralAUSD} free=${r.freeMarginAUSD} risk=${r.riskLevel}`,
    );
  } catch (e: any) {
    rec("perpl", false, e.message);
  }

  try {
    const w = await walletSnapshot(addr);
    rec("wallet", Number(w.ausd) > 0, `ausd=${w.ausd} mon=${w.mon} pos=${w.positions.length}`);
  } catch (e: any) {
    rec("wallet", false, e.message);
  }

  try {
    const provider = getProvider();
    const bal = await provider.getBalance(addr);
    rec("chain.balance", true, `MON=${ethers.formatEther(bal)}`);
    const block = await provider.getBlockNumber();
    rec("chain.block", block > 0, String(block));
  } catch (e: any) {
    rec("chain", false, e.message);
  }

  const pass = results.filter((r) => r.ok).length;
  console.log(`\n=== ${pass}/${results.length} passed ===`);
  if (pass < results.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
