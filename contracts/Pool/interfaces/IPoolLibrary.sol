// SPDX-License-Identifier: GPL-3.0-or-later

interface IPoolLibrary {
    struct MintFD_Params {
        uint256 deus_price_usd;
        uint256 col_price_usd;
        uint256 collateral_amount;
        uint256 col_ratio;
    }

    struct BuybackDEUS_Params {
        uint256 excess_collateral_dollar_value_d18;
        uint256 deus_price_usd;
        uint256 col_price_usd;
        uint256 DEUS_amount;
    }

    function calcMint1t1DEI(uint256 col_price, uint256 collateral_amount_d18)
        external
        pure
        returns (uint256);

    function calcMintAlgorithmicDEI(
        uint256 deus_price_usd,
        uint256 deus_amount_d18
    ) external pure returns (uint256);

    function calcMintFractionalDEI(MintFD_Params memory params)
        external
        pure
        returns (uint256, uint256);

    function calcRedeem1t1DEI(uint256 col_price_usd, uint256 DEI_amount)
        external
        pure
        returns (uint256);

    function calcBuyBackDEUS(BuybackDEUS_Params memory params)
        external
        pure
        returns (uint256);

    function recollateralizeAmount(
        uint256 total_supply,
        uint256 global_collateral_ratio,
        uint256 global_collat_value
    ) external pure returns (uint256);

    function calcRecollateralizeDEIInner(
        uint256 collateral_amount,
        uint256 col_price,
        uint256 global_collat_value,
        uint256 dei_total_supply,
        uint256 global_collateral_ratio
    ) external pure returns (uint256, uint256);
}
