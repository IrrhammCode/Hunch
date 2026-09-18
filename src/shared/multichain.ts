import { MARKETS, enabledMarkets, feedIdFor, labelForFeed, symbolForFeed } from "./markets";

export type ChainId = 10143 | 84532;

export type ChainMeta = {
  chainId: ChainId;
  key: string;
  name: string;
  shortName: string;
  rpcUrl: string;
  explorer: string;
  pyth: string;
  /** deployments file name without .json */
  deploymentKey: "monad-testnet" | "base-sepolia";
  settlementHub?: boolean;
};

export const CHAINS: ChainMeta[] = [
  {
    chainId: 10143,
    key: "monad",
    name: "Monad Testnet",
    shortName: "Monad",
    rpcUrl: "https://testnet-rpc.monad.xyz",
    explorer: "https://testnet.monadvision.com",
    pyth: "0x2880aB155794e7179c9eE2e38200202908C17B43",
    deploymentKey: "monad-testnet",
    settlementHub: true,
  },
  {
    chainId: 84532,
    key: "base",
    name: "Base Sepolia",
    shortName: "Base",
    rpcUrl: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    pyth: "0x5955c1478f0dAD11bE355b853d1E49d43c81e9d1",
    deploymentKey: "base-sepolia",
  },
];

export function chainById(id: number) {
  return CHAINS.find((c) => c.chainId === id);
}

export function chainByKey(key: string) {
  return CHAINS.find((c) => c.key.toLowerCase() === key.toLowerCase()) ?? CHAINS[0]!;
}

/** Enabled chains for this build (P = multi-L1 settlement surface). */
export function enabledChains(): ChainMeta[] {
  const raw = process.env.HUNCH_CHAINS || process.env.CHAINS;
  if (!raw) return CHAINS;
  const keys = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const picked = CHAINS.filter((c) => keys.includes(c.key) || keys.includes(String(c.chainId)));
  return picked.length ? picked : CHAINS;
}

export { MARKETS, enabledMarkets, feedIdFor, labelForFeed, symbolForFeed };
