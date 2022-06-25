// SPDX-License-Identifier: MIT

interface MintableToken {
    function mint(address to, uint256 amount) external;

    function burnFrom(address account, uint256 amount) external;
}
