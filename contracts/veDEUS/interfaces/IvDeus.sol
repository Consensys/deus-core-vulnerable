// SPDX-License-Identifier: MIT

interface IvDeus {
    function balanceOf(address _owner) external view returns (uint256);

    function tokenOfOwnerByIndex(address _owner, uint256 _tokenIndex)
        external
        view
        returns (uint256);
}