// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../Governance/AccessControl.sol";
import "../DEUS/IDEUS.sol";

/// @notice Mint DEUS to the Staking contracts
/// @author DEUS Finance
contract MintHelper is AccessControl {
    IDEUSToken public deus;
    address public daoWallet;
    uint256 public daoShare; // scale: 1e6
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    event Mint(address staking, uint256 amount, uint256 daoShare);
    event SetDaoWallet(address oldDaoWallet, address newDaoWallet);
    event SetDaoShare(uint256 oldDaoShare, uint256 newDaoShare);

    constructor (address admin) {
        deus = IDEUSToken(0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44);
        daoShare = 1e5;
        daoWallet = 0xDC8FFb227671e07D653D65804af7087b5B24e0bf;

        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);
    }

    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, msg.sender), "MintHelper: NOT_MINTER");
        _;
    }

    modifier onlyOwner() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "MintHelper: NOT_OWNER");
        _;
    }

    function mint(address staking, uint256 amount) external onlyMinter {
        uint256 daoAmount = amount * daoShare / 1e6;

        deus.mint(staking, amount - daoAmount);
        deus.mint(daoWallet, daoAmount);

        emit Mint(staking, amount, daoShare);
    }

    function setDaoWallet(address daoWallet_) external onlyOwner {
        emit SetDaoWallet(daoWallet, daoWallet_);
        daoWallet = daoWallet_;
    }

    function setDaoShare(uint256 daoShare_) external onlyOwner {
        emit SetDaoShare(daoShare, daoShare_);
        daoShare = daoShare_;
    }
}