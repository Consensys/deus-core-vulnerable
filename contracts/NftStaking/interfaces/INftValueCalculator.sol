// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface INftValueCalculator {
    function getNftRedeemValues(uint256 tokenId)
        external
        view
        returns (uint256, uint256);
}
