// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {HunchMath} from "./libraries/HunchMath.sol";
import {IPyth} from "./interfaces/IPyth.sol";

/// @title HunchMarket
/// @notice One 60s UP/DOWN hunch round with CPMM YES/NO shares, delayed fills, and Pyth settlement.
contract HunchMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Side {
        YES, // UP — wins if settlement >= strike
        NO // DOWN — wins if settlement < strike
    }

    enum Status {
        Open,
        Resolved
    }

    struct RoundConfig {
        IERC20 collateral; // AUSD (or testnet stand-in)
        IPyth pyth;
        bytes32 priceFeedId; // e.g. BTC/USD
        address factory;
        address feeRecipient;
        uint64 duration; // seconds, typically 60
        uint32 delayBlocks; // latency-arb delay (e.g. 2)
        uint32 maxPriceAge; // Pyth freshness window (seconds)
        uint16 baseFeeBps; // e.g. 100 = 1%
        uint16 maxFeeBps; // early-exit / toxic flow cap
        uint16 protocolFeeBps; // cut of fees to treasury
    }

    struct Intent {
        address trader;
        Side side;
        uint256 collateralIn;
        uint256 minSharesOut;
        uint64 commitBlock;
        bool executed;
        bool cancelled;
    }

    IERC20 public immutable collateral;
    IPyth public immutable pyth;
    bytes32 public immutable priceFeedId;
    address public immutable factory;
    address public immutable feeRecipient;
    address public seedProvider;

    uint64 public immutable duration;
    uint32 public immutable delayBlocks;
    uint32 public immutable maxPriceAge;
    uint16 public immutable baseFeeBps;
    uint16 public immutable maxFeeBps;
    uint16 public immutable protocolFeeBps;

    uint64 public startTime;
    uint64 public expiry;
    int64 public strikePrice;
    int32 public strikeExpo;
    uint64 public strikePublishTime;

    Status public status;
    bool public yesWins;
    int64 public settlementPrice;

    uint256 public yesReserve;
    uint256 public noReserve;
    uint256 public collateralBalance;

    mapping(address => uint256) public yesBalances;
    mapping(address => uint256) public noBalances;

    uint256 public nextIntentId = 1;
    mapping(uint256 => Intent) public intents;

    uint256 public constant BPS = 10_000;

    event RoundOpened(uint64 startTime, uint64 expiry, int64 strikePrice, int32 expo, uint256 seed);
    event IntentCommitted(uint256 indexed intentId, address indexed trader, Side side, uint256 collateralIn);
    event IntentExecuted(uint256 indexed intentId, address indexed trader, Side side, uint256 sharesOut, uint256 fee);
    event IntentCancelled(uint256 indexed intentId);
    event EarlyExit(address indexed trader, Side side, uint256 sharesIn, uint256 collateralOut, uint256 fee);
    event RoundResolved(int64 settlementPrice, bool yesWins);
    event Redeemed(address indexed trader, uint256 shares, uint256 payout);
    event ResidualClaimed(address indexed to, uint256 amount);

    error NotFactory();
    error RoundNotOpen();
    error RoundAlreadyOpen();
    error RoundExpired();
    error RoundNotExpired();
    error AlreadyResolved();
    error NotResolved();
    error IntentNotFound();
    error IntentUsed();
    error DelayPending();
    error NotIntentOwner();
    error ZeroAddress();
    error SeedTooSmall();
    error FeeTransferFailed();
    error NotSeedProvider();
    error ResidualTooEarly();

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    constructor(RoundConfig memory cfg) {
        if (address(cfg.collateral) == address(0) || address(cfg.pyth) == address(0)) revert ZeroAddress();
        if (cfg.factory == address(0) || cfg.feeRecipient == address(0)) revert ZeroAddress();

        collateral = cfg.collateral;
        pyth = cfg.pyth;
        priceFeedId = cfg.priceFeedId;
        factory = cfg.factory;
        feeRecipient = cfg.feeRecipient;
        duration = cfg.duration;
        delayBlocks = cfg.delayBlocks;
        maxPriceAge = cfg.maxPriceAge == 0 ? 30 : cfg.maxPriceAge;
        baseFeeBps = cfg.baseFeeBps;
        maxFeeBps = cfg.maxFeeBps;
        protocolFeeBps = cfg.protocolFeeBps;
    }

    function open(
        uint256 seedCollateral,
        address seedProvider_,
        bytes[] calldata pythUpdateData
    ) external payable onlyFactory nonReentrant {
        if (startTime != 0) revert RoundAlreadyOpen();
        if (seedCollateral < 1e6) revert SeedTooSmall();
        if (seedProvider_ == address(0)) revert ZeroAddress();

        _pullAndUpdatePyth(pythUpdateData);
        IPyth.Price memory px = pyth.getPriceNoOlderThan(priceFeedId, maxPriceAge);

        collateral.safeTransferFrom(msg.sender, address(this), seedCollateral);

        seedProvider = seedProvider_;
        startTime = uint64(block.timestamp);
        expiry = startTime + duration;
        strikePrice = px.price;
        strikeExpo = px.expo;
        strikePublishTime = uint64(px.publishTime);

        yesReserve = seedCollateral;
        noReserve = seedCollateral;
        collateralBalance = seedCollateral;
        status = Status.Open;

        emit RoundOpened(startTime, expiry, strikePrice, strikeExpo, seedCollateral);
    }

    function commitBuy(Side side, uint256 collateralIn, uint256 minSharesOut) external nonReentrant returns (uint256 intentId) {
        _requireTradable();
        if (collateralIn == 0) revert HunchMath.ZeroAmount();

        collateral.safeTransferFrom(msg.sender, address(this), collateralIn);

        intentId = nextIntentId++;
        intents[intentId] = Intent({
            trader: msg.sender,
            side: side,
            collateralIn: collateralIn,
            minSharesOut: minSharesOut,
            commitBlock: uint64(block.number),
            executed: false,
            cancelled: false
        });

        emit IntentCommitted(intentId, msg.sender, side, collateralIn);
    }

    function executeBuy(uint256 intentId, bytes[] calldata pythUpdateData) external payable nonReentrant returns (uint256 sharesOut) {
        Intent storage intent = intents[intentId];
        if (intent.trader == address(0)) revert IntentNotFound();
        if (intent.executed || intent.cancelled) revert IntentUsed();
        if (block.number < intent.commitBlock + delayBlocks) revert DelayPending();
        _requireTradable();

        _pullAndUpdatePyth(pythUpdateData);
        IPyth.Price memory px = pyth.getPriceNoOlderThan(priceFeedId, maxPriceAge);

        uint256 feeBps = _dynamicFeeBps(px);
        uint256 fee = (intent.collateralIn * feeBps) / BPS;
        uint256 net = intent.collateralIn - fee;

        uint256 newYes;
        uint256 newNo;
        if (intent.side == Side.YES) {
            (sharesOut, newYes, newNo) = HunchMath.buyYes(yesReserve, noReserve, net);
            yesBalances[intent.trader] += sharesOut;
        } else {
            (sharesOut, newYes, newNo) = HunchMath.buyNo(yesReserve, noReserve, net);
            noBalances[intent.trader] += sharesOut;
        }
        if (sharesOut < intent.minSharesOut) revert HunchMath.Slippage();

        yesReserve = newYes;
        noReserve = newNo;
        collateralBalance += net;
        intent.executed = true;

        _takeFee(fee);
        emit IntentExecuted(intentId, intent.trader, intent.side, sharesOut, fee);
    }

    function cancelIntent(uint256 intentId) external nonReentrant {
        Intent storage intent = intents[intentId];
        if (intent.trader != msg.sender) revert NotIntentOwner();
        if (intent.executed || intent.cancelled) revert IntentUsed();
        if (block.number < intent.commitBlock + delayBlocks && block.timestamp < expiry) {
            revert DelayPending();
        }

        intent.cancelled = true;
        collateral.safeTransfer(intent.trader, intent.collateralIn);
        emit IntentCancelled(intentId);
    }

    function earlyExit(Side side, uint256 sharesIn, uint256 minCollateralOut) external nonReentrant returns (uint256 payout) {
        _requireTradable();
        if (sharesIn == 0) revert HunchMath.ZeroAmount();

        uint256 collateralOut;
        uint256 newYes;
        uint256 newNo;

        if (side == Side.YES) {
            if (yesBalances[msg.sender] < sharesIn) revert HunchMath.InsufficientLiquidity();
            (collateralOut, newYes, newNo) = HunchMath.sellYes(yesReserve, noReserve, sharesIn);
            yesBalances[msg.sender] -= sharesIn;
        } else {
            if (noBalances[msg.sender] < sharesIn) revert HunchMath.InsufficientLiquidity();
            (collateralOut, newYes, newNo) = HunchMath.sellNo(yesReserve, noReserve, sharesIn);
            noBalances[msg.sender] -= sharesIn;
        }

        uint256 feeBps = _timeDecayFeeBps();
        uint256 fee = (collateralOut * feeBps) / BPS;
        payout = collateralOut - fee;
        if (payout < minCollateralOut) revert HunchMath.Slippage();
        if (payout > collateralBalance) revert HunchMath.InsufficientLiquidity();

        yesReserve = newYes;
        noReserve = newNo;
        collateralBalance -= collateralOut;

        _takeFee(fee);
        collateral.safeTransfer(msg.sender, payout);
        emit EarlyExit(msg.sender, side, sharesIn, payout, fee);
    }

    /// @notice Resolve using a Pyth update whose publishTime falls near expiry.
    function resolve(bytes[] calldata pythUpdateData) external payable nonReentrant {
        if (status != Status.Open) revert AlreadyResolved();
        if (block.timestamp < expiry) revert RoundNotExpired();

        bytes32[] memory ids = new bytes32[](1);
        ids[0] = priceFeedId;

        // Accept publishTime in [expiry, expiry+5] to lock the 60s mark with Hermes jitter.
        uint64 minT = expiry;
        uint64 maxT = expiry + 5;

        uint256 fee = pyth.getUpdateFee(pythUpdateData);
        IPyth.PriceFeed[] memory feeds =
            pyth.parsePriceFeedUpdatesUnique{value: fee}(pythUpdateData, ids, minT, maxT);

        settlementPrice = feeds[0].price.price;
        yesWins = settlementPrice >= strikePrice;
        status = Status.Resolved;

        // refund dust
        if (msg.value > fee) {
            (bool ok,) = msg.sender.call{value: msg.value - fee}("");
            if (!ok) revert FeeTransferFailed();
        }

        emit RoundResolved(settlementPrice, yesWins);
    }

    function redeem() external nonReentrant returns (uint256 payout) {
        if (status != Status.Resolved) revert NotResolved();

        uint256 shares;
        if (yesWins) {
            shares = yesBalances[msg.sender];
            yesBalances[msg.sender] = 0;
        } else {
            shares = noBalances[msg.sender];
            noBalances[msg.sender] = 0;
        }
        if (shares == 0) revert HunchMath.ZeroAmount();
        if (shares > collateralBalance) revert HunchMath.InsufficientLiquidity();

        payout = shares;
        collateralBalance -= payout;
        collateral.safeTransfer(msg.sender, payout);
        emit Redeemed(msg.sender, shares, payout);
    }

    /// @notice Seed provider (vault/LP) reclaims leftover collateral after resolve.
    /// @dev Wait a short grace window so winners can redeem first.
    function claimResidual() external nonReentrant returns (uint256 amount) {
        if (status != Status.Resolved) revert NotResolved();
        if (msg.sender != seedProvider) revert NotSeedProvider();
        if (block.timestamp < expiry + 30) revert ResidualTooEarly();

        amount = collateralBalance;
        if (amount == 0) revert HunchMath.ZeroAmount();
        collateralBalance = 0;
        collateral.safeTransfer(seedProvider, amount);
        emit ResidualClaimed(seedProvider, amount);
    }

    function spotPrices() external view returns (uint256 yesWad, uint256 noWad) {
        yesWad = HunchMath.spotYesPriceWad(yesReserve, noReserve);
        noWad = HunchMath.spotNoPriceWad(yesReserve, noReserve);
    }

    function timeRemaining() external view returns (uint256) {
        if (block.timestamp >= expiry) return 0;
        return expiry - block.timestamp;
    }

    function _requireTradable() internal view {
        if (status != Status.Open) revert RoundNotOpen();
        if (block.timestamp >= expiry) revert RoundExpired();
    }

    function _pullAndUpdatePyth(bytes[] calldata pythUpdateData) internal {
        if (pythUpdateData.length == 0) return;
        uint256 fee = pyth.getUpdateFee(pythUpdateData);
        pyth.updatePriceFeeds{value: fee}(pythUpdateData);
        if (msg.value > fee) {
            (bool ok,) = msg.sender.call{value: msg.value - fee}("");
            if (!ok) revert FeeTransferFailed();
        }
    }

    function _dynamicFeeBps(IPyth.Price memory px) internal view returns (uint256) {
        uint256 absPrice = px.price >= 0 ? uint256(int256(px.price)) : uint256(int256(-px.price));
        if (absPrice == 0) return maxFeeBps;

        uint256 confRatioBps = (uint256(px.conf) * BPS) / absPrice;
        uint256 fee = uint256(baseFeeBps) + confRatioBps;
        if (fee > maxFeeBps) fee = maxFeeBps;
        uint256 decay = _timeDecayFeeBps();
        if (decay > fee) fee = decay;
        return fee;
    }

    function _timeDecayFeeBps() internal view returns (uint256) {
        if (block.timestamp <= startTime) return baseFeeBps;
        uint256 elapsed = block.timestamp - startTime;
        if (elapsed >= duration) return maxFeeBps;
        return uint256(baseFeeBps) + ((uint256(maxFeeBps) - baseFeeBps) * elapsed) / duration;
    }

    function _takeFee(uint256 fee) internal {
        if (fee == 0) return;
        uint256 proto = (fee * protocolFeeBps) / BPS;
        uint256 toLp = fee - proto;
        if (toLp > 0) {
            collateralBalance += toLp;
        }
        if (proto > 0) {
            collateral.safeTransfer(feeRecipient, proto);
        }
    }

    receive() external payable {}
}
