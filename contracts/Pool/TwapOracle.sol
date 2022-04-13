// SPDX-License-Identifier: MIT

import "./interfaces/IBasePairV1";

pragma solidity 0.8.13;

contract Twap {
    BaseV1Pair oracle = BaseV1Pair(0xF42dBcf004a93ae6D5922282B304E2aEFDd50058);

    function getFirstSearchIndex(uint256 redeemTimestamp) public view returns(uint256) {
        uint256 l = oracle.observationLength();
        uint256 delta = block.timestamp - redeemTimestamp;
        uint256 maxPointsNeeded = delta / 30 minutes;
        return l - maxPointsNeeded;
    }

    function firstIndex(uint256 redeemTimestamp) public view returns(uint256) {
        uint256 index = getFirstSearchIndex(redeemTimestamp);
        (uint256 timestamp, ,) = oracle.observations(index);

        while (timestamp < redeemTimestamp) {
            index++;
            (timestamp,,) = oracle.observations(index);
        }
        return index;
    }

    function lastIndex(uint256 redeemTimestamp, uint256 lockTime) public view returns(uint256) {
        uint256 first = firstIndex(redeemTimestamp);
        uint256 lastTimeStamp = lockTime + redeemTimestamp;
        uint256 index = first + 1;
        (uint256 timestamp, ,) = oracle.observations(index);
        while (lastTimeStamp < timestamp) {
            index++;
            (timestamp ,,) = oracle.observations(index);
        }
        return index;
    }

    function prices(uint256 redeemTimestamp, uint256 lockTime) public view returns(uint256) {
        uint256 firstIndex = getFirstIndex(redeemTimestamp);
        uint256 lastIndex = getLastIndex(redeemTimestamp, lockTime);
        uint256[] prices;
        for (uint256 i = firstIndex ; i < lastIndex + 1 ; i ++) {
            prices.push(0);
        }
    }   
}