// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {HunchFactory} from "./HunchFactory.sol";
import {HunchMarket} from "./HunchMarket.sol";

/// @title HunchVault
/// @notice LP pool that seeds rounds and reclaims residual collateral after resolve.
contract HunchVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable collateral;
    HunchFactory public immutable factory;
    address public owner;
    address public keeper;

    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;

    uint256 public seedPerRound; // default AUSD seed pulled each open
    uint256 public constant MIN_SHARES = 1e6;

    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);
    event RoundSeeded(uint256 indexed roundId, address market, uint256 seed);
    event ResidualClaimed(address indexed market, uint256 amount);
    event KeeperUpdated(address indexed keeper);
    event SeedPerRoundUpdated(uint256 seed);

    error NotOwner();
    error NotKeeper();
    error ZeroAmount();
    error InsufficientShares();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper && msg.sender != owner) revert NotKeeper();
        _;
    }

    constructor(IERC20 collateral_, HunchFactory factory_, uint256 seedPerRound_) {
        collateral = collateral_;
        factory = factory_;
        owner = msg.sender;
        keeper = msg.sender;
        seedPerRound = seedPerRound_;
    }

    function setKeeper(address k) external onlyOwner {
        keeper = k;
        emit KeeperUpdated(k);
    }

    function setSeedPerRound(uint256 seed) external onlyOwner {
        seedPerRound = seed;
        emit SeedPerRoundUpdated(seed);
    }

    function setOwner(address next) external onlyOwner {
        owner = next;
    }

    function totalAssets() public view returns (uint256) {
        return collateral.balanceOf(address(this));
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalShares;
        uint256 ta = totalAssets();
        if (supply == 0 || ta == 0) return assets;
        return (assets * supply) / ta;
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalShares;
        uint256 ta = totalAssets();
        if (supply == 0 || ta == 0) return shares;
        return (shares * ta) / supply;
    }

    function deposit(uint256 assets) external nonReentrant returns (uint256 shares) {
        if (assets == 0) revert ZeroAmount();
        shares = convertToShares(assets);
        if (shares == 0) revert ZeroAmount();
        collateral.safeTransferFrom(msg.sender, address(this), assets);
        totalShares += shares;
        sharesOf[msg.sender] += shares;
        emit Deposit(msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) external nonReentrant returns (uint256 assets) {
        if (shares == 0) revert ZeroAmount();
        if (sharesOf[msg.sender] < shares) revert InsufficientShares();
        assets = convertToAssets(shares);
        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        collateral.safeTransfer(msg.sender, assets);
        emit Withdraw(msg.sender, assets, shares);
    }

    /// @notice Keeper: pull Pyth off-tx first, then seed a new round with empty updateData.
    function seedRound(bytes32 feedId) external onlyKeeper nonReentrant returns (uint256 roundId, address market) {
        uint256 seed = seedPerRound;
        if (seed == 0 || totalAssets() < seed) revert ZeroAmount();

        collateral.forceApprove(address(factory), seed);
        (roundId, market) = factory.createAndOpen(feedId, seed, new bytes[](0));
        emit RoundSeeded(roundId, market, seed);
    }

    /// @notice After resolve + redemptions, reclaim leftover collateral into the vault.
    function claimResidual(address market) external onlyKeeper nonReentrant returns (uint256 amount) {
        amount = HunchMarket(payable(market)).claimResidual();
        emit ResidualClaimed(market, amount);
    }
}
