// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Oracle is AccessControl {
    using ECDSA for bytes32;

    // role
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    constructor(address _admin) {
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function verify(bytes32 hash, bytes[] calldata sigs)
        public
        view
        returns (bool)
    {
        for (uint256 index = 0; index < sigs.length; ++index) {
            if (!hasRole(ORACLE_ROLE, hash.recover(sigs[index]))) {
                return false;
            }
        }
        return true;
    }
}
