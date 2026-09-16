// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {HunchMarket} from "./HunchMarket.sol";
import {IPyth} from "./interfaces/IPyth.sol";

/// @title HunchFactory
/// @notice Spawns 60s hunch rounds. One market contract per round (keeps state contention scoped).
contract HunchFactory {
    using SafeERC20 for IERC20;

    IERC20 public immutable collateral;
    IPyth public immutable pyth;
    address public immutable feeRecipient;

    uint64 public defaultDuration = 60;
    uint32 public defaultDelayBlocks = 2;
    uint32 public defaultMaxPriceAge = 30; // seconds — Hermes RTT friendly on testnet
    uint16 public defaultBaseFeeBps = 100; // 1%
    uint16 public defaultMaxFeeBps = 2500; // 25%
    uint16 public defaultProtocolFeeBps = 2000; // 20% of fees

    address public owner;

    uint256 public roundCount;
    mapping(uint256 => address) public rounds;
    mapping(bytes32 => uint256) public latestRoundByFeed;

    event RoundCreated(uint256 indexed roundId, address indexed market, bytes32 indexed feedId, uint256 seed);
    event OwnerUpdated(address indexed owner);
    event DefaultsUpdated(uint64 duration, uint32 delayBlocks, uint32 maxPriceAge, uint16 baseFeeBps, uint16 maxFeeBps);

    error NotOwner();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(IERC20 collateral_, IPyth pyth_, address feeRecipient_) {
        if (address(collateral_) == address(0) || address(pyth_) == address(0) || feeRecipient_ == address(0)) {
            revert ZeroAddress();
        }
        collateral = collateral_;
        pyth = pyth_;
        feeRecipient = feeRecipient_;
        owner = msg.sender;
    }

    function setOwner(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        owner = next;
        emit OwnerUpdated(next);
    }

    function setDefaults(
        uint64 duration,
        uint32 delayBlocks,
        uint32 maxPriceAge,
        uint16 baseFeeBps,
        uint16 maxFeeBps,
        uint16 protocolFeeBps
    ) external onlyOwner {
        defaultDuration = duration;
        defaultDelayBlocks = delayBlocks;
        defaultMaxPriceAge = maxPriceAge;
        defaultBaseFeeBps = baseFeeBps;
        defaultMaxFeeBps = maxFeeBps;
        defaultProtocolFeeBps = protocolFeeBps;
        emit DefaultsUpdated(duration, delayBlocks, maxPriceAge, baseFeeBps, maxFeeBps);
    }

    function createAndOpen(
        bytes32 priceFeedId,
        uint256 seedCollateral,
        bytes[] calldata pythUpdateData
    ) external payable returns (uint256 roundId, address market) {
        HunchMarket.RoundConfig memory cfg = HunchMarket.RoundConfig({
            collateral: collateral,
            pyth: pyth,
            priceFeedId: priceFeedId,
            factory: address(this),
            feeRecipient: feeRecipient,
            duration: defaultDuration,
            delayBlocks: defaultDelayBlocks,
            maxPriceAge: defaultMaxPriceAge,
            baseFeeBps: defaultBaseFeeBps,
            maxFeeBps: defaultMaxFeeBps,
            protocolFeeBps: defaultProtocolFeeBps
        });

        market = address(new HunchMarket(cfg));
        roundId = ++roundCount;
        rounds[roundId] = market;
        latestRoundByFeed[priceFeedId] = roundId;

        collateral.safeTransferFrom(msg.sender, address(this), seedCollateral);
        collateral.forceApprove(market, seedCollateral);

        // seedProvider = caller (EOA LP or HunchVault)
        HunchMarket(payable(market)).open{value: msg.value}(seedCollateral, msg.sender, pythUpdateData);

        emit RoundCreated(roundId, market, priceFeedId, seedCollateral);
    }
}
