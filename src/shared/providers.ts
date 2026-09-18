import fs from "fs";
import path from "path";
import { Contract, JsonRpcProvider } from "ethers";
import { CHAINS, type ChainMeta } from "./multichain";

type DeployFile = {
  chainId: number;
  factory: string | null;
  vault: string | null;
  pyth: string;
  collateral: { address: string; decimals: number; symbol: string };
  markets?: { symbol: string; pair: string; feedId: string }[];
};

const providerCache = new Map<number, JsonRpcProvider>();

export function providerForChain(chain: ChainMeta) {
  const hit = providerCache.get(chain.chainId);
  if (hit) return hit;
  const url =
    (chain.chainId === 10143 && process.env.MONAD_RPC_URL) ||
    (chain.chainId === 84532 && process.env.BASE_RPC_URL) ||
    chain.rpcUrl;
  const p = new JsonRpcProvider(url, chain.chainId, { staticNetwork: true });
  providerCache.set(chain.chainId, p);
  return p;
}

export function loadChainDeployment(chain: ChainMeta): DeployFile | null {
  const p = path.join(__dirname, "..", "..", "deployments", `${chain.deploymentKey}.json`);
  if (!fs.existsSync(p)) return null;
  const dep = JSON.parse(fs.readFileSync(p, "utf8")) as DeployFile;
  if (!dep.factory) return null;
  return dep;
}

export function factoryAbi() {
  return [
    "function roundCount() view returns (uint256)",
    "function rounds(uint256) view returns (address)",
    "function latestRoundByFeed(bytes32) view returns (uint256)",
  ];
}

export function marketAbi() {
  return [
    "function status() view returns (uint8)",
    "function expiry() view returns (uint64)",
    "function strikePrice() view returns (int64)",
    "function priceFeedId() view returns (bytes32)",
    "function spotPrices() view returns (uint256, uint256)",
    "function yesBalances(address) view returns (uint256)",
    "function noBalances(address) view returns (uint256)",
    "function yesWins() view returns (bool)",
  ];
}

export function contractAt(addr: string, abi: string[], provider: JsonRpcProvider) {
  return new Contract(addr, abi, provider);
}

/** Chains that have a real factory address in deployments/. */
export function settlementChains(): { chain: ChainMeta; dep: DeployFile }[] {
  const out: { chain: ChainMeta; dep: DeployFile }[] = [];
  for (const chain of CHAINS) {
    const dep = loadChainDeployment(chain);
    if (dep?.factory) out.push({ chain, dep });
  }
  return out;
}
