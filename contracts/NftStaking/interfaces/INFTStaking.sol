// SPDX-License-Identifier: MIT

interface INFTStaking {
    function toggleFreeExit() external;
    function freeExit() external view returns(bool);
    function exitFor(uint256 nftId) external;
    function setBlackList(address user, bool isBlocked) external;
}
