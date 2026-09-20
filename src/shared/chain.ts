import fs from "fs";
import path from "path";
import { Contract, JsonRpcProvider, Wallet, ethers } from "ethers";
import { MONAD_TESTNET } from "../../config/addresses";
import { enabledMarkets, type MarketMeta } from "./markets";
import { maskRpcUrl, resolveMonadRpcUrl, type MonadRpcRole } from "./rpc";

export type Deployment = {
  network: string;
  chainId: number;
  factory: string;
  pyth: string;
  btcUsdFeedId: string;
  markets?: { symbol: string; pair: string; feedId: string }[];
  collateral: { address: string; decimals: number; symbol: string; faucet?: string; note?: string };
  perpl?: { exchange: string; apiUrl: string; wsUrl: string; chainId: number; collateral?: string };
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

/** Active multi-asset market list (env/catalog). */
export function activeMarkets(dep?: Deployment): MarketMeta[] {
  loadEnv();
  return enabledMarkets();
}

const providerCache = new Map<string, JsonRpcProvider>();

/**
 * Monad provider — prefers Quicknode via role-specific env then MONAD_RPC_URL.
 * Roles: api (default), keeper (txs), indexer, hardhat.
 */
export function getProvider(role: MonadRpcRole = "default") {
  loadEnv();
  const url = resolveMonadRpcUrl(role);
  const hit = providerCache.get(url);
  if (hit) return hit;
  const p = new JsonRpcProvider(url, MONAD_TESTNET.chainId, {
    staticNetwork: true,
  });
  providerCache.set(url, p);
  return p;
}

export function getWallet() {
  loadEnv();
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error("PRIVATE_KEY required");
  // Writes go through keeper-role RPC (isolates Quicknode credits if KEEPER_RPC_URL set)
  return new Wallet(key.startsWith("0x") ? key : `0x${key}`, getProvider("keeper"));
}

export function logProviderSource(role: MonadRpcRole = "default") {
  return `${role} rpc ${maskRpcUrl(resolveMonadRpcUrl(role))}`;
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
    signerOrProvider,
  );
}

export function agoraFaucetContract(signerOrProvider: ethers.Signer | ethers.Provider, dep = loadDeployment()) {
  const faucetAddr = dep.collateral.faucet || "0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C";
  return new Contract(
    faucetAddr,
    [
      "function requestFunds(address recipient) external returns (bool)",
    ],
    signerOrProvider,
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
    signerOrProvider,
  );
}

export function vaultContract(signerOrProvider: ethers.Signer | ethers.Provider, dep = loadDeployment()) {
  if (!dep.vault) throw new Error("vault not in deployment — redeploy with HunchVault");
  return new Contract(dep.vault, loadAbi("HunchVault"), signerOrProvider);
}

export { MONAD_TESTNET, ethers };
