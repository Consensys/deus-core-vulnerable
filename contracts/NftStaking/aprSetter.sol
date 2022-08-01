// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;


import "./interfaces/IMasterChefV2.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AprSetter is AccessControl {
    address public masterChef;
    bytes32 immutable public SETTER_ROLE = keccak256("SETTER_ROLE");

    struct PoolAllocPoint {
        uint256 poolId;
        uint256 allocationPoint;
    }

    constructor(address admin, address setter, address masterChef_) {
        require(admin != address(0) && setter != address(0) && masterChef_ != address(0), "AprSetter: ZERO_ADDRESS");
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(SETTER_ROLE, setter);
        masterChef = masterChef_;
    }

    function setMasterChef(address masterChef_) onlyRole(SETTER_ROLE) external {
        masterChef = masterChef_;
    }

    function setApr(PoolAllocPoint[] memory poolAllocPoints, uint256 tokenPerSecond) external onlyRole(SETTER_ROLE) {
        require(IMasterChefV2(masterChef).poolLength() == poolAllocPoints.length, "AprSetter: INVALID_LENGTH");
        for (uint8 i = 0 ; i < poolAllocPoints.length; i++) {
            IMasterChefV2(masterChef).set(poolAllocPoints[i].poolId, poolAllocPoints[i].allocationPoint);
        }
        IMasterChefV2(masterChef).setTokenPerSecond(tokenPerSecond);
    }
}