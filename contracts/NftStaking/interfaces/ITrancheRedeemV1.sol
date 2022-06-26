// SPDX-License-Identifier: MIT

interface ITrancheRedeemV1 {
    // struct Redemption {
    //     uint256 deiAmount;
    //     // Redemption tranche
    //     uint8 tranche;
    // }

    // struct Tranche {
    //     // Boosted to 1e6
    //     uint256 USDRatio;
    //     uint256 amountRemaining;
    //     // Boosted to 1e6
    //     uint256 deusRatio;
    //     uint256 endTime;
    // }

    function redemptions(uint256 i) external view returns (uint256, uint8); // Redemption

    function tranches(uint8 i)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        ); // Tranche
}
