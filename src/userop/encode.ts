import { ethers } from "ethers";
import { loadAbi } from "../shared/chain";

/**
 * Encoded calls for Account Abstraction / session-key UserOps (Privy + ZeroDev).
 * iOS sends these via Kernel account — paymaster sponsors gas.
 */
export function buildCommitCalldata(
  market: string,
  side: "YES" | "NO",
  amount: bigint,
  minShares: bigint
) {
  const iface = new ethers.Interface(loadAbi("HunchMarket"));
  const data = iface.encodeFunctionData("commitBuy", [side === "YES" ? 0 : 1, amount, minShares]);
  return { to: market, data, value: "0", description: "commitBuy" };
}

export function buildExecuteCalldata(market: string, intentId: bigint) {
  const iface = new ethers.Interface(loadAbi("HunchMarket"));
  // Empty pyth payload — keeper/API should have pulled price already, or client pulls first
  const data = iface.encodeFunctionData("executeBuy", [intentId, []]);
  return {
    to: market,
    data,
    value: "0",
    description: "executeBuy",
    note: "Ensure Pyth was updated in a prior UserOp/tx within maxPriceAge",
  };
}

export function buildRedeemCalldata(market: string) {
  const iface = new ethers.Interface(loadAbi("HunchMarket"));
  return { to: market, data: iface.encodeFunctionData("redeem", []), value: "0", description: "redeem" };
}

/**
 * Session-key policy sketch for ZeroDev Kernel (documented for iOS wiring).
 * Not executed here — consumed by mobile SDK.
 */
export function sessionKeyPolicyTemplate(market: string) {
  return {
    permissions: [
      {
        target: market,
        abi: ["function commitBuy(uint8 side,uint256 collateralIn,uint256 minSharesOut)"],
        functions: ["commitBuy"],
      },
      {
        target: market,
        abi: ["function executeBuy(uint256 intentId,bytes[] pythUpdateData)"],
        functions: ["executeBuy"],
      },
      {
        target: market,
        abi: ["function earlyExit(uint8 side,uint256 sharesIn,uint256 minCollateralOut)"],
        functions: ["earlyExit"],
      },
      {
        target: market,
        abi: ["function redeem()"],
        functions: ["redeem"],
      },
    ],
    spendingCapAUSD: "50",
    ttlMinutes: 15,
    paymaster: {
      provider: "alchemy | zerodev",
      note: "Set ALCHEMY_GAS_POLICY_ID / ZERODEV_PAYMASTER_RPC in mobile env",
    },
  };
}
