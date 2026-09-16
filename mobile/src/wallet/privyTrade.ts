import {
  decodeFunctionResult,
  encodeFunctionData,
  parseAbi,
} from "viem";
import {
  executeTrade,
  fetchCommitCalldata,
  fetchRedeemCalldata,
  fetchWallet,
  walletFaucet,
  type ExecuteTradeResult,
  type WalletSnapshot,
} from "../api/client";
import { CHAIN_ID } from "../config/chain";

const MARKET_ABI = parseAbi([
  "function nextIntentId() view returns (uint256)",
]);

async function rpc(provider: any, method: string, params: any[] = []) {
  return provider.request({ method, params });
}

async function waitForTx(provider: any, hash: string, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const receipt = await rpc(provider, "eth_getTransactionReceipt", [hash]);
      if (receipt) {
        if (receipt.status === "0x0") throw new Error(`tx reverted: ${hash}`);
        return receipt as { transactionHash: string; blockNumber: string };
      }
    } catch (e) {
      if (i === attempts - 1) throw e;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timeout waiting for tx ${hash}`);
}

function toHexChainId(id: number) {
  return `0x${id.toString(16)}`;
}

async function ensureChain(provider: any) {
  try {
    const current = await rpc(provider, "eth_chainId");
    if (Number(current) === CHAIN_ID) return;
    await rpc(provider, "wallet_switchEthereumChain", [{ chainId: toHexChainId(CHAIN_ID) }]);
  } catch (e: any) {
    if (e?.code === 4902 || /Unrecognized chain/i.test(String(e?.message))) {
      await rpc(provider, "wallet_addEthereumChain", [
        {
          chainId: toHexChainId(CHAIN_ID),
          chainName: "Monad Testnet",
          nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
          rpcUrls: [process.env.EXPO_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"],
          blockExplorerUrls: ["https://testnet.monadvision.com"],
        },
      ]);
    }
  }
}

async function sendTx(
  provider: any,
  from: string,
  tx: { to: string; data: string; value?: string },
) {
  const hash = (await rpc(provider, "eth_sendTransaction", [
    {
      from,
      to: tx.to,
      data: tx.data,
      value: tx.value && tx.value !== "0" ? tx.value : "0x0",
      chainId: toHexChainId(CHAIN_ID),
    },
  ])) as string;
  return waitForTx(provider, hash);
}

async function readNextIntentId(provider: any, market: string): Promise<bigint> {
  const data = encodeFunctionData({
    abi: MARKET_ABI,
    functionName: "nextIntentId",
  });
  const raw = await rpc(provider, "eth_call", [{ to: market, data }, "latest"]);
  return decodeFunctionResult({
    abi: MARKET_ABI,
    functionName: "nextIntentId",
    data: raw as `0x${string}`,
  }) as bigint;
}

export type PrivyTradeResult = ExecuteTradeResult & {
  trader: string;
  commitTx: string;
  funded: boolean;
};

/**
 * Real trade path (Privy + ecosystem):
 * 1. Faucet MockAUSD + MON when the embedded wallet is thin
 * 2. Privy wallet signs approve + commitBuy on Monad testnet
 * 3. API hot-wallet waits delay-blocks, pulls Pyth, executeBuy (anyone can execute)
 */
export async function placePrivyTrade(params: {
  provider: any;
  address: string;
  side: "UP" | "DOWN";
  amountAUSD: string;
}): Promise<PrivyTradeResult> {
  const { provider, address, side, amountAUSD } = params;
  await ensureChain(provider);

  let funded = false;
  try {
    const snap = await fetchWallet(address);
    const ausd = Number(snap.ausd);
    const mon = Number(snap.mon);
    if (ausd < Number(amountAUSD) || mon < 0.01) {
      await walletFaucet(address, ausd < Number(amountAUSD) ? "1000" : "20");
      funded = true;
    }
  } catch {
    try {
      await walletFaucet(address, "1000");
      funded = true;
    } catch {
      /* wallet may already be funded */
    }
  }

  const calldata = await fetchCommitCalldata(side, amountAUSD);
  await ensureChain(provider);

  await sendTx(provider, address, calldata.approve);
  const commitReceipt = await sendTx(provider, address, calldata.commit);

  const next = await readNextIntentId(provider, calldata.market);
  const intentId = (next > 0n ? next - 1n : 0n).toString();

  let result: ExecuteTradeResult;
  try {
    result = await executeTrade(address, intentId);
  } catch {
    result = await executeTrade(address);
  }

  return {
    ...result,
    trader: address,
    commitTx: commitReceipt.transactionHash,
    funded,
  };
}

export async function redeemPrivyPosition(params: {
  provider: any;
  address: string;
  market: string;
}): Promise<{ tx: string }> {
  const { provider, address, market } = params;
  await ensureChain(provider);
  const calldata = await fetchRedeemCalldata(market);
  const receipt = await sendTx(provider, address, calldata);
  return { tx: receipt.transactionHash };
}

export async function getWalletSnapshot(address: string): Promise<WalletSnapshot> {
  return fetchWallet(address);
}

export async function fundPrivyWallet(address: string) {
  return walletFaucet(address, "1000");
}
