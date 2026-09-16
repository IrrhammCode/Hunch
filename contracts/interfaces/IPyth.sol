// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @notice Subset of Pyth IPyth used by Hunch. ABI-compatible with Monad Pyth Core.
/// @dev On Monad testnet/mainnet: 0x2880aB155794e7179c9eE2e38200202908C17B43
interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint publishTime;
    }

    struct PriceFeed {
        bytes32 id;
        Price price;
        Price emaPrice;
    }

    function getUpdateFee(bytes[] calldata updateData) external view returns (uint256 fee);

    function updatePriceFeeds(bytes[] calldata updateData) external payable;

    function getPriceNoOlderThan(bytes32 id, uint256 age) external view returns (Price memory price);

    function getPriceUnsafe(bytes32 id) external view returns (Price memory price);

    function parsePriceFeedUpdatesUnique(
        bytes[] calldata updateData,
        bytes32[] calldata priceIds,
        uint64 minPublishTime,
        uint64 maxPublishTime
    ) external payable returns (PriceFeed[] memory priceFeeds);
}
