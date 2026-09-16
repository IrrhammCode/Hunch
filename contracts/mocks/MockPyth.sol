// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPyth} from "../interfaces/IPyth.sol";

/// @dev Controllable oracle for local E2E. Mirrors the pull-oracle call pattern.
contract MockPyth is IPyth {
    uint256 public updateFee = 1 wei;

    mapping(bytes32 => Price) private _prices;

    error PriceTooOld();
    error InvalidUpdate();
    error FeedNotFound();

    function setUpdateFee(uint256 fee) external {
        updateFee = fee;
    }

    /// @dev Encode: abi.encode(feedId, price, conf, expo, publishTime)
    function getUpdateFee(bytes[] calldata) external view returns (uint256) {
        return updateFee;
    }

    function updatePriceFeeds(bytes[] calldata updateData) external payable {
        if (msg.value < updateFee * updateData.length) revert InvalidUpdate();
        for (uint256 i = 0; i < updateData.length; i++) {
            (bytes32 id, int64 price, uint64 conf, int32 expo, uint publishTime) =
                abi.decode(updateData[i], (bytes32, int64, uint64, int32, uint));
            _prices[id] = Price({price: price, conf: conf, expo: expo, publishTime: publishTime});
        }
    }

    function getPriceNoOlderThan(bytes32 id, uint256 age) external view returns (Price memory price) {
        price = _prices[id];
        if (price.publishTime == 0) revert FeedNotFound();
        if (block.timestamp > price.publishTime + age) revert PriceTooOld();
    }

    function getPriceUnsafe(bytes32 id) external view returns (Price memory price) {
        price = _prices[id];
        if (price.publishTime == 0) revert FeedNotFound();
    }

    function parsePriceFeedUpdatesUnique(
        bytes[] calldata updateData,
        bytes32[] calldata priceIds,
        uint64 minPublishTime,
        uint64 maxPublishTime
    ) external payable returns (PriceFeed[] memory priceFeeds) {
        if (msg.value < updateFee * updateData.length) revert InvalidUpdate();
        priceFeeds = new PriceFeed[](priceIds.length);

        for (uint256 i = 0; i < priceIds.length; i++) {
            bool found;
            for (uint256 j = 0; j < updateData.length; j++) {
                (bytes32 id, int64 price, uint64 conf, int32 expo, uint publishTime) =
                    abi.decode(updateData[j], (bytes32, int64, uint64, int32, uint));
                if (id != priceIds[i]) continue;
                if (publishTime < minPublishTime || publishTime > maxPublishTime) continue;
                priceFeeds[i] = PriceFeed({
                    id: id,
                    price: Price({price: price, conf: conf, expo: expo, publishTime: publishTime}),
                    emaPrice: Price({price: price, conf: conf, expo: expo, publishTime: publishTime})
                });
                _prices[id] = priceFeeds[i].price;
                found = true;
                break;
            }
            if (!found) revert InvalidUpdate();
        }
    }

    function pushPrice(bytes32 id, int64 price, uint64 conf, int32 expo, uint publishTime) external {
        _prices[id] = Price({price: price, conf: conf, expo: expo, publishTime: publishTime});
    }
}
