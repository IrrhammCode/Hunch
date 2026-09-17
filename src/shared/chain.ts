import fs from "fs";
import path from "path";
import { Contract, JsonRpcProvider, Wallet, ethers } from "ethers";
import { MONAD_TESTNET } from "../../config/addresses";

export type Deployment = {
  network: string;
  chainId: number;
  factory: string;
  pyth: string;
  btcUsdFeedId: string;
  collateral: { address: string; decimals: number; symbol: string };
  vault?: string;
};

export function loadEnv() {
  const envPath = path.join(__dirname, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export function loadDeployment(): Deployment {
  const p = path.join(__dirname, "..", "..", "deployments", "monad-testnet.json");
  if (!fs.existsSync(p)) throw new Error(`Missing ${p}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

let cachedProvider: JsonRpcProvider | null = null;

export function getProvider() {
  loadEnv();
  if (cachedProvider) return cachedProvider;
  cachedProvider = new JsonRpcProvider(
    process.env.MONAD_RPC_URL || MONAD_TESTNET.rpcUrl,
    MONAD_TESTNET.chainId,
    { staticNetwork: true },
  );
  return cachedProvider;
}

export function getWallet() {
  loadEnv();
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error("PRIVATE_KEY required");
  return new Wallet(key.startsWith("0x") ? key : `0x${key}`, getProvider());
}

export function loadAbi(name: string): any[] {
  const candidates = [
    path.join(__dirname, "..", "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`),
    path.join(__dirname, "..", "..", "artifacts", "contracts", "mocks", `${name}.sol`, `${name}.json`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return JSON.parse(fs.readFileSync(c, "utf8")).abi;
    }
  }
  throw new Error(`ABI not found for ${name}`);
}

export function factoryContract(signerOrProvider: ethers.Signer | ethers.Provider, dep = loadDeployment()) {
  return new Contract(dep.factory, loadAbi("HunchFactory"), signerOrProvider);
}

export function marketContract(addr: string, signerOrProvider: ethers.Signer | ethers.Provider) {
  return new Contract(addr, loadAbi("HunchMarket"), signerOrProvider);
}

export function ausdContract(signerOrProvider: ethers.Signer | ethers.Provider, dep = loadDeployment()) {
  return new Contract(
    dep.collateral.address,
    [
      "function approve(address,uint256) returns (bool)",
      "function allowance(address,address) view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      "function mint(address,uint256)",
      "function decimals() view returns (uint8)",
      "function transfer(address,uint256) returns (bool)",
    ],
    signerOrProvider
  );
}

export function pythContract(signerOrProvider: ethers.Signer | ethers.Provider, dep = loadDeployment()) {
  return new Contract(
    dep.pyth,
    [
      "function getUpdateFee(bytes[] updateData) view returns (uint256)",
      "function updatePriceFeeds(bytes[] updateData) payable",
      "function getPriceNoOlderThan(bytes32 id, uint256 age) view returns (int64 price, uint64 conf, int32 expo, uint publishTime)",
      "function getPriceUnsafe(bytes32 id) view returns (int64 price, uint64 conf, int32 expo, uint publishTime)",
    ],
    signerOrProvider
  );
}

export function vaultContract(signerOrProvider: ethers.Signer | ethers.Provider, dep = loadDeployment()) {
  if (!dep.vault) throw new Error("vault not in deployment — redeploy with HunchVault");
  return new Contract(dep.vault, loadAbi("HunchVault"), signerOrProvider);
}

export { MONAD_TESTNET, ethers };
