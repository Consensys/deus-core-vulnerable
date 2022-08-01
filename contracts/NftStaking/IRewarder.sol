// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IRewarder {
  function onReward(
    uint256 pid,
    address user,
    uint256 newLpAmount
  ) external;

  function poolExists(uint256 pid) external view returns (bool);
}