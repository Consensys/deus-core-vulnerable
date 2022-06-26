// SPDX-License-Identifier: MIT

interface ITrancheRedeemV2 {
    // struct Redemption {
    //     uint256 deiAmount;
    //     // Redemption tranche
    //     uint8 tranche;
    // }

    function redemptions(uint256 i) external view returns (uint256, uint8); // Redemption

    // vDEUS tokenId to USDC redeemed
    function redeemAmounts(uint256 i) external view returns (uint256);
}
