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

    function emergencyWithdraw(uint256 pid, address to) external;
}
