// Be name Khoda
// Bime Abolfazl

// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DeusBag is AccessControl {
  using SafeERC20 for IERC20;

  /* ========== STATE VARIABLES ========== */
  uint256 public transferLimit;
  mapping(address => bool) public rewarders;
  address public deus;

  bytes32 public constant REFILL_ROLE = keccak256("REFILL_ROLE");
  bytes32 public constant SETTER_ROLE = keccak256("SETTER_ROLE");

  /* ========== CONSTRUCTOR ========== */

  constructor(
    address deus_,
    uint256 transferLimit_,
    address refill,
    address setter,
    address admin
  ) {
    deus = deus_;
    transferLimit = transferLimit_;
    _setupRole(DEFAULT_ADMIN_ROLE, admin);
    _setupRole(REFILL_ROLE, refill);
    _setupRole(SETTER_ROLE, setter);
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function setTransferLimit(uint256 transferLimit_)
    external
    onlyRole(SETTER_ROLE)
  {
    transferLimit = transferLimit_;
  }

  function setRewarder(address rewarder, bool isRewarder)
    external
    onlyRole(SETTER_ROLE)
  {
    rewarders[rewarder] = isRewarder;
  }

  function refill(address rewarder, uint256 deusAmount)
    external
    onlyRole(REFILL_ROLE)
  {
    require(rewarders[rewarder], "NOT_VALID_REWARDER");
    require(deusAmount <= transferLimit, "LIMIT_ERROR");
    IERC20(deus).safeTransfer(rewarder, deusAmount);
  }

  function withdrawERC20(address token, uint256 amount)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    IERC20(token).safeTransfer(msg.sender, amount);
  }
}

//Dar panah khoda
