// SPDX-License-Identifier: MIT

struct Observation {
    uint256 timestamp;
    uint256 reserve0Cumulative;
    uint256 reserve1Cumulative;
}

interface IBasePairV1 {
    function observations(uint256 index)
        external
        view
        returns (Observation calldata);
    function observationLength() external view returns (uint256)
}
