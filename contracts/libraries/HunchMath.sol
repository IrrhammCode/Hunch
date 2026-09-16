// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library HunchMath {
    error ZeroAmount();
    error InsufficientLiquidity();
    error Slippage();

    /// @notice Complete-set mint + swap NO→YES against x*y=k pool.
    function buyYes(
        uint256 yesReserve,
        uint256 noReserve,
        uint256 collateralIn
    ) internal pure returns (uint256 sharesOut, uint256 newYes, uint256 newNo) {
        if (collateralIn == 0) revert ZeroAmount();
        if (yesReserve == 0 || noReserve == 0) revert InsufficientLiquidity();

        uint256 k = yesReserve * noReserve;
        newNo = noReserve + collateralIn;
        newYes = k / newNo;
        if (newYes >= yesReserve) revert InsufficientLiquidity();

        uint256 yesFromSwap = yesReserve - newYes;
        sharesOut = collateralIn + yesFromSwap;
    }

    /// @notice Complete-set mint + swap YES→NO against x*y=k pool.
    function buyNo(
        uint256 yesReserve,
        uint256 noReserve,
        uint256 collateralIn
    ) internal pure returns (uint256 sharesOut, uint256 newYes, uint256 newNo) {
        if (collateralIn == 0) revert ZeroAmount();
        if (yesReserve == 0 || noReserve == 0) revert InsufficientLiquidity();

        uint256 k = yesReserve * noReserve;
        newYes = yesReserve + collateralIn;
        newNo = k / newYes;
        if (newNo >= noReserve) revert InsufficientLiquidity();

        uint256 noFromSwap = noReserve - newNo;
        sharesOut = collateralIn + noFromSwap;
    }

    /// @notice Sell YES back into pool (early exit). Returns collateral out before fees.
    function sellYes(
        uint256 yesReserve,
        uint256 noReserve,
        uint256 sharesIn
    ) internal pure returns (uint256 collateralOut, uint256 newYes, uint256 newNo) {
        if (sharesIn == 0) revert ZeroAmount();
        if (yesReserve == 0 || noReserve == 0) revert InsufficientLiquidity();

        uint256 k = yesReserve * noReserve;
        newYes = yesReserve + sharesIn;
        newNo = k / newYes;
        if (newNo >= noReserve) revert InsufficientLiquidity();

        uint256 noFromSwap = noReserve - newNo;
        // Burn complete set: user gives YES, receives matching NO from swap, redeems min pair.
        // Collateral unlocked = noFromSwap (the NO acquired pairs with `noFromSwap` of the YES).
        // Remaining YES stays in pool as newYes - noFromSwap after redeem...
        // Simpler invariant-preserving exit used by many CPMMs:
        collateralOut = noFromSwap;
        if (collateralOut > sharesIn) {
            // Cap: cannot unlock more than shares sold via complete-set identity.
            collateralOut = sharesIn;
        }
        // After selling `sharesIn` YES into pool and redeeming `collateralOut` complete sets:
        newYes = yesReserve + sharesIn - collateralOut;
        newNo = noReserve - collateralOut;
    }

    function sellNo(
        uint256 yesReserve,
        uint256 noReserve,
        uint256 sharesIn
    ) internal pure returns (uint256 collateralOut, uint256 newYes, uint256 newNo) {
        if (sharesIn == 0) revert ZeroAmount();
        if (yesReserve == 0 || noReserve == 0) revert InsufficientLiquidity();

        uint256 k = yesReserve * noReserve;
        newNo = noReserve + sharesIn;
        newYes = k / newNo;
        if (newYes >= yesReserve) revert InsufficientLiquidity();

        uint256 yesFromSwap = yesReserve - newYes;
        collateralOut = yesFromSwap;
        if (collateralOut > sharesIn) {
            collateralOut = sharesIn;
        }
        newNo = noReserve + sharesIn - collateralOut;
        newYes = yesReserve - collateralOut;
    }

    function spotYesPriceWad(uint256 yesReserve, uint256 noReserve) internal pure returns (uint256) {
        uint256 sum = yesReserve + noReserve;
        if (sum == 0) return 0;
        return (noReserve * 1e18) / sum;
    }

    function spotNoPriceWad(uint256 yesReserve, uint256 noReserve) internal pure returns (uint256) {
        uint256 sum = yesReserve + noReserve;
        if (sum == 0) return 0;
        return (yesReserve * 1e18) / sum;
    }
}
