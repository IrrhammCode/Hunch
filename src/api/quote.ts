import { ethers } from "ethers";
import { getProvider, marketContract } from "../shared/chain";

/**
 * Off-chain quote approximating CPMM buy (complete-set + swap).
 * Matches HunchMath.buyYes / buyNo for UI preview.
 */
export async function quoteBuy(market: string, side: "YES" | "NO", amountAUSD: string) {
  const m = marketContract(market, getProvider());
  const amount = ethers.parseUnits(amountAUSD, 6);
  const yesReserve = BigInt(await m.yesReserve());
  const noReserve = BigInt(await m.noReserve());
  const baseFeeBps = BigInt(await m.baseFeeBps());
  const fee = (amount * baseFeeBps) / 10_000n;
  const net = amount - fee;

  let sharesOut: bigint;
  if (side === "YES") {
    const k = yesReserve * noReserve;
    const newNo = noReserve + net;
    const newYes = k / newNo;
    sharesOut = net + (yesReserve - newYes);
  } else {
    const k = yesReserve * noReserve;
    const newYes = yesReserve + net;
    const newNo = k / newYes;
    sharesOut = net + (noReserve - newNo);
  }

  const [yesWad] = await m.spotPrices();
  return {
    side,
    amountIn: amountAUSD,
    feeAUSD: ethers.formatUnits(fee, 6),
    netAUSD: ethers.formatUnits(net, 6),
    sharesOut: ethers.formatUnits(sharesOut, 6),
    impliedSpotYes: ethers.formatUnits(yesWad, 18),
    note: "Estimate using baseFeeBps only; on-chain fee may be higher near expiry / high conf",
  };
}
