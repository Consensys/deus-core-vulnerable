// SPDX-License-Identifier: MIT

// =================================================================================================================
//  _|_|_|    _|_|_|_|  _|    _|    _|_|_|      _|_|_|_|  _|                                                       |
//  _|    _|  _|        _|    _|  _|            _|            _|_|_|      _|_|_|  _|_|_|      _|_|_|    _|_|       |
//  _|    _|  _|_|_|    _|    _|    _|_|        _|_|_|    _|  _|    _|  _|    _|  _|    _|  _|        _|_|_|_|     |
//  _|    _|  _|        _|    _|        _|      _|        _|  _|    _|  _|    _|  _|    _|  _|        _|           |
//  _|_|_|    _|_|_|_|    _|_|    _|_|_|        _|        _|  _|    _|    _|_|_|  _|    _|    _|_|_|    _|_|_|     |
// =================================================================================================================
// ============================= Oracle =============================
// ==================================================================
// DEUS Finance: https://github.com/DeusFinance

// Primary Author(s)
// Sina: https://github.com/spsina
// Vahid: https://github.com/vahid-dev

import "./IMuonV02.sol";

interface IDynamicRedeem {

    struct RedeemPosition {
        uint256 amount;
        uint256 timestamp;
    }

    /* ========== PUBLIC VIEWS ========== */

    function collatDollarBalance(uint256 collateralPrice)
        external
        view
        returns (uint256 balance);

    function positionsLength(address user)
        external
        view
        returns (uint256 length);

    function getAllPositions(address user)
        external
        view
        returns (RedeemPosition[] memory positinos);

    function getUnRedeemedPositions(address user)
        external
        view
        returns (RedeemPosition[] memory positions);



    function redeemFractionalDEI(uint256 deiAmount) external;

    function collectCollateral() external;

    function collectDeus(
        uint256 price,
        bytes calldata _reqId,
        SchnorrSign[] calldata sigs
    ) external;

    /* ========== RESTRICTED FUNCTIONS ========== */
    function collectDaoShare(uint256 amount, address to) external;

    function emergencyWithdrawERC20(
        address token,
        uint256 amount,
        address to
    ) external;

    function toggleRedeeming() external;


    function setPoolParameters(
        uint256 poolCeiling_,
        uint256 collateralRedemptionDelay_,
        uint256 deusRedemptionDelay_,
        uint256 redemptionFee_,
        address muon_,
        uint32 appId_,
        uint256 minimumRequiredSignatures_
    ) external;

    /* ========== EVENTS ========== */

    event PoolParametersSet(
        uint256 poolCeiling,
        uint256 collateralRedemptionDelay,
        uint256 deusRedemptionDelay,
        uint256 redemptionFee,
        address muon,
        uint32 appId,
        uint256 minimumRequiredSignatures
    );
    event CollectDaoShare(uint256 daoShare, address to);
    event ToggleMinting(bool toggled);
    event ToggleRedeeming(bool toggled);
    event ToggleRecollateralize(bool toggled);
    event ToggleBuyback(bool toggled);
    event CollectCollateral(uint256 amount, address to);
    event CollectDeus(uint256 amount, address to, uint256 redeemId);
    event Redeem(address user, uint256 amount, uint256 globalCollateralRatio);
    event Mint(address user, uint256 amount, uint256 globalCollateralRatio);
}
