import { getWallet, factoryContract, loadDeployment } from "../src/shared/chain";
import { waitForReceipt } from "../src/shared/pythPull";

async function main() {
  const wallet = getWallet();
  const dep = loadDeployment();
  const factory = factoryContract(wallet, dep);

  console.log("Wallet:", wallet.address);
  console.log("Factory:", dep.factory);

  const curAge = await factory.defaultMaxPriceAge();
  console.log("Current maxPriceAge:", curAge.toString());

  console.log("Sending setDefaults tx...");
  const tx = await factory.setDefaults(60, 2, 31536000, 100, 2500, 2000, {
    gasLimit: 200_000n,
  });
  console.log("Tx hash:", tx.hash);

  const receipt = await waitForReceipt(wallet.provider!, tx.hash, 60, 1000);
  console.log("Receipt confirmed in block:", receipt.blockNumber);

  const newAge = await factory.defaultMaxPriceAge();
  console.log("New maxPriceAge:", newAge.toString());
}

main().catch(console.error);
