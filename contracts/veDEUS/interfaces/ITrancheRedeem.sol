// SPDX-License-Identifier: MIT

interface ITrancheRedeem {
    struct Redemption {
        uint256 deiAmount;
        // Redemption tranche
        uint8 tranche;
    }

    function redemptions(uint) external view returns (Redemption memory);
}