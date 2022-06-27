// Be name Khoda
// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

// Primary Author(s)
// Vahid: https://github.com/vahid-dev

import "./interfaces/IvDeus.sol";
import "./interfaces/ITrancheRedeem.sol";

contract RedeemVote {
    address public vDeus;
    address public trancheRedeem;
    address public trancheRedeemV2;

    constructor(address vDeus_, address trancheRedeem_, address trancheRedeemV2_) {
        vDeus = vDeus_;
        trancheRedeem = trancheRedeem_;
        trancheRedeemV2 = trancheRedeemV2_;
    }

    function balanceOf(address user) public view returns (uint256 balance) {
        uint256 count = IvDeus(vDeus).balanceOf(user);
        for (uint256 index = 0; index < count; index++) {
            uint256 tokenId = IvDeus(vDeus).tokenOfOwnerByIndex(user, index);
            balance += ITrancheRedeem(trancheRedeem).redemptions(tokenId).deiAmount;
            balance += ITrancheRedeem(trancheRedeemV2).redemptions(tokenId).deiAmount;
        }
    }
}

//Dar panah khoda
