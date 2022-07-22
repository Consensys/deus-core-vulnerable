// SPDX-License-Identifier: MIT
// Be name Khoda

pragma solidity 0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/INFTStaking.sol";

contract NFTStakingExtractor is AccessControl {
    address public nftStaking;
    bytes32 public constant EXTRACTOR_ROLE = keccak256("EXTRACTOR_ROLE");

    constructor(
        address nftStaking_,
        address extractor,
        address admin
    ) {
        nftStaking = nftStaking_;

        _setupRole(EXTRACTOR_ROLE, extractor);
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setNFTStaking(address nftStaking_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        nftStaking = nftStaking_;
    }

    function extract(uint256[] calldata nftIds, bool addToBlackList)
        external
        onlyRole(EXTRACTOR_ROLE)
    {
        INFTStaking InftStaking = INFTStaking(nftStaking);
        bool isFreeExit = InftStaking.freeExit();
        if (!isFreeExit) {
            InftStaking.toggleFreeExit();
        }
        for (uint256 i = 0; i < nftIds.length; i++) {
            InftStaking.exitFor(nftIds[i]);
            if (addToBlackList) {
                InftStaking.setBlackList(InftStaking.nftUser(nftIds[i]), true);
            }
        }
        if (!isFreeExit) {
            InftStaking.toggleFreeExit();
        }
    }
}
