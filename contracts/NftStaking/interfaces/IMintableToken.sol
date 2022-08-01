// SPDX-License-Identifier: MIT

interface IMintableToken {
    function mint(address to, uint256 amount) external;

    function burnFrom(address account, uint256 amount) external;
}
