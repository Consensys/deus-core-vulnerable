// Be name Khoda
// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.8.13;
pragma abicoder v2;

// =================================================================================================================
//  _|_|_|    _|_|_|_|  _|    _|    _|_|_|      _|_|_|_|  _|                                                       |
//  _|    _|  _|        _|    _|  _|            _|            _|_|_|      _|_|_|  _|_|_|      _|_|_|    _|_|       |
//  _|    _|  _|_|_|    _|    _|    _|_|        _|_|_|    _|  _|    _|  _|    _|  _|    _|  _|        _|_|_|_|     |
//  _|    _|  _|        _|    _|        _|      _|        _|  _|    _|  _|    _|  _|    _|  _|        _|           |
//  _|_|_|    _|_|_|_|    _|_|    _|_|_|        _|        _|  _|    _|    _|_|_|  _|    _|    _|_|_|    _|_|_|     |
// =================================================================================================================
// ============================= DEIPool =============================
// ===================================================================
// DEUS Finance: https://github.com/DeusFinance

// Primary Author(s)
// Vahid: https://github.com/vahid-dev

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../Uniswap/TransferHelper.sol";
import "./interfaces/IPoolLibrary.sol";
import "./interfaces/IDynamicRedeem.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IDEUS.sol";
import "./interfaces/IDEI.sol";
import "./interfaces/ILender.sol";

/// @title Minter Pool Contract V2
/// @author DEUS Finance
/// @notice Minter pool of DEI stablecoin
/// @dev Uses twap and vwap for DEUS price in DEI redemption by using muon oracles
///      Usable for stablecoins as collateral
contract DynamicRedeem is IDynamicRedeem, AccessControl {
    /* ========== STATE VARIABLES ========== */
    address public collateral;
    address private dei;
    address private deus;

    uint256 public mintingFee;
    uint256 public redemptionFee = 10000;
    uint256 public buybackFee = 5000;
    uint256 public recollatFee = 5000;

    mapping(address => uint256) public redeemCollateralBalances;
    uint256 public unclaimedPoolCollateral;
    mapping(address => uint256) public lastCollateralRedeemed;

    // position data
    mapping(address => IDynamicRedeem.RedeemPosition[]) public redeemPositions;
    mapping(address => uint256) public nextRedeemId;

    uint256 public collateralRedemptionDelay;
    uint256 public deusRedemptionDelay;

    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_MAX = 1e6;
    uint256 private constant COLLATERAL_PRICE = 1e6;
    uint256 private constant SCALE = 1e6;

    // Number of decimals needed to get to 18
    uint256 private immutable missingDecimals;

    // Pool_ceiling is the total units of collateral that a pool contract can hold
    uint256 public poolCeiling;

    // Bonus rate on DEUS minted during RecollateralizeDei(); 6 decimals of precision, set to 0.75% on genesis
    uint256 public bonusRate = 7500;

    uint256 public daoShare = 0; // fees goes to daoWallet

    address public poolLibrary; // Pool library contract

    address public muon;
    uint32 public appId;
    uint256 minimumRequiredSignatures;

    address[] public lenders = [
        0x8D643d954798392403eeA19dB8108f595bB8B730,
        0x118FF56bb12E5E0EfC14454B8D7Fa6009487D64E
    ];
    address[] public wallets;
    address public scDei = 0x68C102aBA11f5e086C999D99620C78F5Bc30eCD8;

    // AccessControl Roles
    bytes32 public constant PARAMETER_SETTER_ROLE =
        keccak256("PARAMETER_SETTER_ROLE");
    bytes32 public constant DAO_SHARE_COLLECTOR =
        keccak256("DAO_SHARE_COLLECTOR");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant TRUSTY_ROLE = keccak256("TRUSTY_ROLE");

    // AccessControl state variables
    bool public mintPaused = false;
    bool public redeemPaused = false;
    bool public recollateralizePaused = false;
    bool public buyBackPaused = false;

    /* ========== MODIFIERS ========== */
    modifier notRedeemPaused() {
        require(redeemPaused == false, "DEIPool: REDEEM_PAUSED");
        _;
    }

    modifier notMintPaused() {
        require(mintPaused == false, "DEIPool: MINTING_PAUSED");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address dei_,
        address deus_,
        address collateral_,
        address muon_,
        address library_,
        address admin,
        uint256 minimumRequiredSignatures_,
        uint256 collateralRedemptionDelay_,
        uint256 poolCeiling_,
        uint32 appId_
    ) {
        require(
            (dei_ != address(0)) &&
                (deus_ != address(0)) &&
                (collateral_ != address(0)) &&
                (library_ != address(0)) &&
                (admin != address(0)),
            "DEIPool: ZERO_ADDRESS_DETECTED"
        );
        dei = dei_;
        deus = deus_;
        collateral = collateral_;
        muon = muon_;
        appId = appId_;
        minimumRequiredSignatures = minimumRequiredSignatures_;
        collateralRedemptionDelay = collateralRedemptionDelay_;
        deusRedemptionDelay = type(uint256).max;
        poolCeiling = poolCeiling_;
        poolLibrary = library_;
        missingDecimals = uint256(18) - IERC20(collateral).decimals();

        _setupRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /* ========== VIEWS ========== */

    // Returns dollar value of collateral held in this DEI pool
    function collatDollarBalance(uint256 collateralPrice)
        public
        view
        returns (uint256 balance)
    {
        balance =
            ((IERC20(collateral).balanceOf(address(this)) -
                unclaimedPoolCollateral) *
                (10**missingDecimals) *
                collateralPrice) /
            (PRICE_PRECISION);
    }

    function positionsLength(address user)
        external
        view
        returns (uint256 length)
    {
        length = redeemPositions[user].length;
    }

    function getAllPositions(address user)
        external
        view
        returns (RedeemPosition[] memory positinos)
    {
        positinos = redeemPositions[user];
    }

    function getUnRedeemedPositions(address user)
        external
        view
        returns (RedeemPosition[] memory positions)
    {
        uint256 totalRedeemPositions = redeemPositions[user].length;
        uint256 redeemId = nextRedeemId[user];
        uint256 index = 0;
        for (uint256 i = redeemId; i < totalRedeemPositions; i++) {
            positions[index] = redeemPositions[user][i];
            index++;
        }
    }

    function _getChainId() internal view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

    function getCirculatingSupply() public view returns (uint256) {
        uint256 overCollateralizedDei;
        uint256 excessAmount;
        for (uint256 i; i < lenders.length; i++) {
            (excessAmount, ) = ILender(lenders[i]).totalBorrow();
            overCollateralizedDei += excessAmount;
        }

        uint256 scDeiBalance = IERC20(dei).balanceOf(scDei);

        uint256 daoWalletsBalance;
        for (uint256 i; i < wallets.length; i++) {
            daoWalletsBalance += IERC20(dei).balanceOf(wallets[i]);
        }

        return
            IERC20(dei).totalSupply() -
            overCollateralizedDei -
            scDeiBalance -
            daoWalletsBalance;
    }

    function getCollateralRatio() public view returns (uint256) {
        return
            (IERC20(collateral).balanceOf(address(this)) * 1e18) /
            getCirculatingSupply();
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Will fail if fully collateralized or algorithmic
    // Redeem DEI for collateral and DEUS. > 0% and < 100% collateral-backed
    function redeemFractionalDEI(uint256 deiAmount) external notRedeemPaused {
        uint256 globalCollateralRatio = getCollateralRatio();
        require(
            globalCollateralRatio < COLLATERAL_RATIO_MAX &&
                globalCollateralRatio > 0,
            "DEIPool: INVALID_COLLATERAL_RATIO"
        );

        // Blocking is just for solving stack depth problem
        uint256 collateralAmount;
        {
            uint256 deiAmountPostFee = (deiAmount * (SCALE - redemptionFee)) /
                (PRICE_PRECISION);
            uint256 deiAmountPrecision = deiAmountPostFee /
                (10**missingDecimals);
            collateralAmount =
                (deiAmountPrecision * globalCollateralRatio) /
                PRICE_PRECISION;
        }
        require(
            collateralAmount <=
                IERC20(collateral).balanceOf(address(this)) -
                    unclaimedPoolCollateral,
            "DEIPool: NOT_ENOUGH_COLLATERAL"
        );

        redeemCollateralBalances[msg.sender] += collateralAmount;
        lastCollateralRedeemed[msg.sender] = block.timestamp;
        unclaimedPoolCollateral = unclaimedPoolCollateral + collateralAmount;

        {
            uint256 deiAmountPostFee = (deiAmount * (SCALE - redemptionFee)) /
                SCALE;
            uint256 deusDollarAmount = (deiAmountPostFee *
                (SCALE - globalCollateralRatio)) / SCALE;

            redeemPositions[msg.sender].push(
                RedeemPosition({
                    amount: deusDollarAmount,
                    timestamp: block.timestamp
                })
            );
        }

        daoShare += (deiAmount * redemptionFee) / SCALE;

        IDEI(dei).pool_burn_from(msg.sender, deiAmount);
    }

    function collectCollateral() external {
        require(
            (lastCollateralRedeemed[msg.sender] + collateralRedemptionDelay) <=
                block.timestamp,
            "DEIPool: COLLATERAL_REDEMPTION_DELAY"
        );

        if (redeemCollateralBalances[msg.sender] > 0) {
            uint256 collateralAmount = redeemCollateralBalances[msg.sender];
            redeemCollateralBalances[msg.sender] = 0;
            TransferHelper.safeTransfer(
                collateral,
                msg.sender,
                collateralAmount
            );
            unclaimedPoolCollateral =
                unclaimedPoolCollateral -
                collateralAmount;
        }
    }

    function collectDeus(
        uint256 price,
        bytes calldata _reqId,
        SchnorrSign[] calldata sigs
    ) external {
        require(
            sigs.length >= minimumRequiredSignatures,
            "DEIPool: INSUFFICIENT_SIGNATURES"
        );

        uint256 redeemId = nextRedeemId[msg.sender]++;

        require(
            redeemPositions[msg.sender][redeemId].timestamp +
                deusRedemptionDelay <=
                block.timestamp,
            "DEIPool: DEUS_REDEMPTION_DELAY"
        );

        {
            bytes32 hash = keccak256(
                abi.encodePacked(
                    appId,
                    msg.sender,
                    redeemId,
                    price,
                    _getChainId()
                )
            );
            require(
                IMuonV02(muon).verify(_reqId, uint256(hash), sigs),
                "DEIPool: UNVERIFIED_SIGNATURES"
            );
        }

        uint256 deusAmount = (redeemPositions[msg.sender][redeemId].amount *
            1e18) / price;

        IDEUS(deus).pool_mint(msg.sender, deusAmount);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function addWallet(address[] memory wallets_)
        external
        onlyRole(TRUSTY_ROLE)
    {
        for (uint256 i; i < wallets_.length; i++) {
            wallets.push(wallets_[i]);
        }
    }

    function collectDaoShare(uint256 amount, address to)
        external
        onlyRole(DAO_SHARE_COLLECTOR)
    {
        require(amount <= daoShare, "DEIPool: INVALID_AMOUNT");

        IDEI(dei).pool_mint(to, amount);
        daoShare -= amount;

        emit CollectDaoShare(amount, to);
    }

    function emergencyWithdrawERC20(
        address token,
        uint256 amount,
        address to
    ) external onlyRole(TRUSTY_ROLE) {
        IERC20(token).transfer(to, amount);
    }

    function toggleRedeeming() external onlyRole(PAUSER_ROLE) {
        redeemPaused = !redeemPaused;
        emit ToggleRedeeming(redeemPaused);
    }

    // Combined into one function due to 24KiB contract memory limit
    function setPoolParameters(
        uint256 poolCeiling_,
        uint256 collateralRedemptionDelay_,
        uint256 deusRedemptionDelay_,
        uint256 redemptionFee_,
        address muon_,
        uint32 appId_,
        uint256 minimumRequiredSignatures_
    ) external onlyRole(PARAMETER_SETTER_ROLE) {
        poolCeiling = poolCeiling_;
        collateralRedemptionDelay = collateralRedemptionDelay_;
        deusRedemptionDelay = deusRedemptionDelay_;
        redemptionFee = redemptionFee_;
        muon = muon_;
        appId = appId_;
        minimumRequiredSignatures = minimumRequiredSignatures_;

        emit PoolParametersSet(
            poolCeiling_,
            collateralRedemptionDelay_,
            deusRedemptionDelay_,
            redemptionFee_,
            muon_,
            appId_,
            minimumRequiredSignatures_
        );
    }
}

//Dar panah khoda
