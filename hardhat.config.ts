import fs from "fs";
import path from "path";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-network-helpers";

// Lightweight .env loader (no dotenv dependency)
(() => {
  try {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // ignore
  }
})();

const privateKey = process.env.PRIVATE_KEY?.startsWith("0x")
  ? process.env.PRIVATE_KEY
  : process.env.PRIVATE_KEY
    ? `0x${process.env.PRIVATE_KEY}`
    : undefined;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    monadTestnet: {
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: privateKey ? [privateKey] : [],
    },
    monadMainnet: {
      url: process.env.MONAD_MAINNET_RPC_URL || "https://rpc.monad.xyz",
      chainId: 143,
      accounts: privateKey ? [privateKey] : [],
    },
    baseSepolia: {
      url: process.env.BASE_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: privateKey ? [privateKey] : [],
    },
  },
  mocha: {
    timeout: 120_000,
  },
};

export default config;
