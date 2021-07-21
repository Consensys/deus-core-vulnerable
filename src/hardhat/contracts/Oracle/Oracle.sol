// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;

import "../Governance/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Oracle is AccessControl {
    using ECDSA for bytes32;

    // role
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant TRUSTY_ROLE = keccak256("TRUSTY_ROLE");

    uint256 minimumRequiredSignature;

    event MinimumRequiredSignatureSet(uint256 minimumRequiredSignature);

    constructor(address _admin, uint256 _minimumRequiredSignature) {
        require(_admin != address(0), "ORACLE::constructor: zero address detected.");
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        minimumRequiredSignature = _minimumRequiredSignature;
    }

    function verify(bytes32 hash, bytes[] calldata sigs)
        public
        view
        returns (bool)
    {
        address lastOracle;
        for (uint256 index = 0; index < minimumRequiredSignature; ++index) {
            address oracle = hash.recover(sigs[index]);
            if (!hasRole(ORACLE_ROLE, oracle)) {
                return false;
            }
            require(oracle > lastOracle, "ORACLE::verify: signers are same.");
            lastOracle = oracle;
        }
        return true;
    }

    function setMinimumRequiredSignature(uint256 _minimumRequiredSignature)
        public
    {
        require(
            hasRole(TRUSTY_ROLE, msg.sender),
            "ORACLE::setMinimumRequiredSignature: you are not a setter."
        );
        minimumRequiredSignature = _minimumRequiredSignature;

        emit MinimumRequiredSignatureSet(_minimumRequiredSignature);
    }
}
