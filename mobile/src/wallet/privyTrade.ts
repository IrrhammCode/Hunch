import {
  decodeFunctionResult,
  encodeFunctionData,
  parseAbi,
  parseEther,
  parseUnits,
} from "viem";
import {
  executeTrade,
  fetchCommitCalldata,
  fetchRedeemCalldata,
  fetchPerplDepositCalldata,
  fetchPerplWithdrawCalldata,
  relayDepositMargin,
  linkPerplAccount,
  fetchWallet,
  walletFaucet,
  type ExecuteTradeResult,
  type WalletSnapshot,
} from "../api/client";
import { CHAIN_ID } from "../config/chain";

export const AUSD_TOKEN_ADDRESS = "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC";

const MARKET_ABI = parseAbi([
  "function nextIntentId() view returns (uint256)",
]);

const ERC20_TRANSFER_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
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
        return receipt as {
          transactionHash: string;
          blockNumber: string;
          logs?: Array<{ address?: string; data?: string; topics?: string[] }>;
        };
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
 * Real trade path (Mera passkey EOA):
 * 1. Faucet Agora AUSD + MON when the wallet is thin
 * 2. Wallet signs approve + commitBuy on Monad testnet
 * 3. API hot-wallet waits delay-blocks, pulls Pyth, executeBuy (shares credit trader)
 */
export async function placeWalletTrade(params: {
  provider: any;
  address: string;
  side: "UP" | "DOWN";
  amountAUSD: string;
  symbol?: string;
  market?: string;
}): Promise<PrivyTradeResult> {
  const { provider, address, side, amountAUSD, symbol, market } = params;

  // FULL MOCK design mode — labeled fake fill, no chain
  if (process.env.EXPO_PUBLIC_USE_MOCK !== "0" || provider?.isMock) {
    const { mockTradeFill } = await import("../mock/fixtures");
    const result = mockTradeFill(side, amountAUSD, symbol || "BTC") as any;
    return {
      ...result,
      trader: address || result.trader,
      intentId: "mock-1",
      funded: true,
      commitTx: result.executeTx,
    };
  }

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Wallet required — sign in with Face ID / Mera passkey first.");
  }
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

  const calldata = await fetchCommitCalldata(side, amountAUSD, symbol);
  await ensureChain(provider);

  await sendTx(provider, address, calldata.approve);
  const commitReceipt = await sendTx(provider, address, calldata.commit);

  const next = await readNextIntentId(provider, calldata.market);
  const intentId = (next > 0n ? next - 1n : 0n).toString();

  let result: ExecuteTradeResult;
  try {
    result = await executeTrade(address, intentId, calldata.market || market);
  } catch {
    result = await executeTrade(address, undefined, calldata.market || market);
  }

  return {
    ...result,
    trader: address,
    commitTx: commitReceipt.transactionHash,
    funded,
  };
}

export async function redeemWalletPosition(params: {
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

export async function fundWallet(address: string) {
  return walletFaucet(address, "1000");
}

export async function depositPerplMargin(params: {
  provider: any;
  address: string;
  amountAUSD: number;
}): Promise<{
  depositTx: string;
  approveTx?: string;
  amountAUSD: number;
  accountId?: number;
}> {
  const { provider, address, amountAUSD } = params;

  if (process.env.EXPO_PUBLIC_USE_MOCK !== "0" || provider?.isMock) {
    return {
      depositTx: "0xmockDeposit" + Date.now().toString(16),
      amountAUSD,
      accountId: 644,
    };
  }

  await ensureChain(provider);

  try {
    const calldata = await fetchPerplDepositCalldata(amountAUSD, address);
    let approveTx: string | undefined;

    if (calldata.approve?.to && calldata.approve?.data && calldata.approve.data !== "0x") {
      try {
        const appReceipt = await sendTx(provider, address, calldata.approve);
        approveTx = appReceipt.transactionHash;
      } catch (appErr) {
        console.warn("[deposit] approve skipped or allowance exists", appErr);
      }
    }

    const depReceipt = await sendTx(provider, address, calldata.deposit);

    let discoveredAccountId: number | undefined = calldata.accountId;
    if (!discoveredAccountId && depReceipt.logs) {
      for (const log of depReceipt.logs) {
        if (log.address?.toLowerCase() === calldata.exchange?.toLowerCase() && log.data && log.data.length >= 130) {
          try {
            const idWord = "0x" + log.data.slice(66, 130);
            const n = Number(BigInt(idWord));
            if (n > 0 && n < 1e9) discoveredAccountId = n;
          } catch {
            /* skip */
          }
        }
      }
    }

    if (discoveredAccountId) {
      try {
        await linkPerplAccount(address, discoveredAccountId);
      } catch {
        /* skip */
      }
    }

    return {
      approveTx,
      depositTx: depReceipt.transactionHash,
      amountAUSD,
      accountId: discoveredAccountId,
    };
  } catch (err: any) {
    // If client direct tx encounters issue, fallback to relayed margin deposit
    const relayRes = await relayDepositMargin(amountAUSD, address);
    return {
      depositTx: relayRes.txHash,
      amountAUSD,
      accountId: relayRes.accountId,
    };
  }
}

export async function withdrawPerplMargin(params: {
  provider: any;
  address: string;
  amountAUSD: number;
}): Promise<{ tx: string; amountAUSD: number }> {
  const { provider, address, amountAUSD } = params;

  if (process.env.EXPO_PUBLIC_USE_MOCK !== "0" || provider?.isMock) {
    return {
      tx: "0xmockWithdraw" + Date.now().toString(16),
      amountAUSD,
    };
  }

  await ensureChain(provider);
  const calldata = await fetchPerplWithdrawCalldata(amountAUSD, address);
  const receipt = await sendTx(provider, address, calldata.withdraw);
  return {
    tx: receipt.transactionHash,
    amountAUSD,
  };
}

/** @deprecated alias */
export const placePrivyTrade = placeWalletTrade;

/** @deprecated alias */
export const redeemPrivyPosition = redeemWalletPosition;

/** @deprecated alias */
export const fundPrivyWallet = fundWallet;

export type SendTransferParams = {
  provider: any;
  from: string;
  to: string;
  amount: string;
  token: "AUSD" | "MON";
};

export type SendTransferResult = {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  token: "AUSD" | "MON";
};

/**
 * Onchain transfer for Agora AUSD (ERC-20, 6 decimals) or native MON (18 decimals) on Monad Testnet (10143).
 */
export async function sendOnchainTransfer(
  params: SendTransferParams,
): Promise<SendTransferResult> {
  const { provider, from, to, amount, token } = params;

  if (!from || !/^0x[a-fA-F0-9]{40}$/.test(from)) {
    throw new Error("Invalid sender wallet address.");
  }
  if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
    throw new Error("Invalid recipient EVM address. Address must start with 0x and be 42 characters.");
  }
  const cleanAmount = amount.trim();
  const numAmount = parseFloat(cleanAmount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Transfer amount must be greater than 0.");
  }

  // MOCK MODE
  if (process.env.EXPO_PUBLIC_USE_MOCK !== "0" || provider?.isMock) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      txHash: "0xmockTransfer" + Date.now().toString(16),
      from,
      to,
      amount: cleanAmount,
      token,
    };
  }

  await ensureChain(provider);

  if (token === "MON") {
    const valueWei = parseEther(cleanAmount);
    const valueHex = `0x${valueWei.toString(16)}`;
    const receipt = await sendTx(provider, from, {
      to,
      data: "0x",
      value: valueHex,
    });
    return {
      txHash: receipt.transactionHash,
      from,
      to,
      amount: cleanAmount,
      token: "MON",
    };
  } else {
    // Agora AUSD (6 decimals)
    const amountRaw = parseUnits(cleanAmount, 6);
    const data = encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [to as `0x${string}`, amountRaw],
    });
    const receipt = await sendTx(provider, from, {
      to: AUSD_TOKEN_ADDRESS,
      data,
      value: "0x0",
    });
    return {
      txHash: receipt.transactionHash,
      from,
      to,
      amount: cleanAmount,
      token: "AUSD",
    };
  }
}

