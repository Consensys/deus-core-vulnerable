// SPDX-License-Identifier: MIT

interface INftValueCalculator {
    function getNftValue(uint256 tokenId) external view returns (uint256);
}
