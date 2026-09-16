// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HunchMath} from "../libraries/HunchMath.sol";

/**
 * @dev Thin wrapper so Hardhat can exercise the pure library in unit tests.
 */
contract HunchMathHarness {
    function buyYes(uint256 y, uint256 n, uint256 amount)
        external
        pure
        returns (uint256 sharesOut, uint256 newYes, uint256 newNo)
    {
        return HunchMath.buyYes(y, n, amount);
    }

    function buyNo(uint256 y, uint256 n, uint256 amount)
        external
        pure
        returns (uint256 sharesOut, uint256 newYes, uint256 newNo)
    {
        return HunchMath.buyNo(y, n, amount);
    }

    function sellYes(uint256 y, uint256 n, uint256 shares)
        external
        pure
        returns (uint256 out, uint256 newYes, uint256 newNo)
    {
        return HunchMath.sellYes(y, n, shares);
    }

    function sellNo(uint256 y, uint256 n, uint256 shares)
        external
        pure
        returns (uint256 out, uint256 newYes, uint256 newNo)
    {
        return HunchMath.sellNo(y, n, shares);
    }

    function spotYes(uint256 y, uint256 n) external pure returns (uint256) {
        return HunchMath.spotYesPriceWad(y, n);
    }

    function spotNo(uint256 y, uint256 n) external pure returns (uint256) {
        return HunchMath.spotNoPriceWad(y, n);
    }
}
