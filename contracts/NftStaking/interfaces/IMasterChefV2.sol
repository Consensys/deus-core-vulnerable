// SPDX-License-Identifier: MIT

interface IMasterChefV2 {
    function deposit(
        uint256 pid,
        uint256 amount,
        address to
    ) external;

    function withdraw(
        uint256 pid,
        uint256 amount,
        address userAddress,
        address to
    ) external;

    function withdrawAndHarvest(
        uint256 pid,
        uint256 amount,
        address userAddress,
        address to
    ) external;

    function emergencyWithdraw(uint256 pid, address userAddress, address to) external;
    function poolLength() external view returns(uint256);
    function set(uint256 pid, uint256 allocPoint) external;
    function setTokenPerSecond(uint256 tokenPerSecond) external;
}
