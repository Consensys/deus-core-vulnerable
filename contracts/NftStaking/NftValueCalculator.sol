// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "./interfaces/INftValueCalculator.sol";
import "./interfaces/ITrancheRedeemV1.sol";
import "./interfaces/ITrancheRedeemV2.sol";

contract NftValueCalculator is INftValueCalculator {
    address public trancheRedeemer1; // 0x4f57964159ED08B23e30391c531e7438D61Ea151
    address public trancheRedeemer2; // 0xFD74E924dc96c72Ba52439e28CE780908A630D13
    uint256 public v1Edge;

    constructor(
        address trancheRedeemer1_,
        address trancheRedeemer2_,
        uint256 v1Edge_
    ) public {
        trancheRedeemer1 = trancheRedeemer1_;
        trancheRedeemer2 = trancheRedeemer2_;
        v1Edge = v1Edge_;
    }

    function getNftRedeemValues(uint256 tokenId)
        external
        view
        override
        returns (uint256 deiAmount, uint256 usdcAmount)
    {
        if (tokenId <= v1Edge) {
            uint8 trancheId;
            (deiAmount, trancheId) = ITrancheRedeemV1(trancheRedeemer1)
                .redemptions(tokenId);
            (uint256 usdcRatio, , , ) = ITrancheRedeemV1(trancheRedeemer1)
                .tranches(trancheId);
            usdcAmount = (deiAmount * usdcRatio) / 1e6;
        } else {
            usdcAmount = ITrancheRedeemV2(trancheRedeemer2).redeemAmounts(
                tokenId
            );
            (deiAmount, ) = ITrancheRedeemV2(trancheRedeemer2).redemptions(
                tokenId
            );
        }
    }
}
