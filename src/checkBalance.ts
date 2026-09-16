import { loadEnv, getWallet, loadDeployment, factoryContract } from "./shared/chain";
import { ethers } from "ethers";

loadEnv();

async function main() {
  const w = getWallet();
  const bal = await w.provider!.getBalance(w.address);
  const dep = loadDeployment();
  const f = factoryContract(w, dep);
  const rounds = await f.roundCount();
  console.log(
    JSON.stringify(
      {
        address: w.address,
        mon: ethers.formatEther(bal),
        factory: dep.factory,
        roundCount: rounds.toString(),
        faucet: "https://faucet.monad.xyz",
      },
      null,
      2
    )
  );
}

main();
