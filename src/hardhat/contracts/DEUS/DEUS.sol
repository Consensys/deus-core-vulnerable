// Be name Khoda
// Bime Abolfazl

// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.9;

// =================================================================================================================
//  _|_|_|    _|_|_|_|  _|    _|    _|_|_|      _|_|_|_|  _|                                                       |
//  _|    _|  _|        _|    _|  _|            _|            _|_|_|      _|_|_|  _|_|_|      _|_|_|    _|_|       |
//  _|    _|  _|_|_|    _|    _|    _|_|        _|_|_|    _|  _|    _|  _|    _|  _|    _|  _|        _|_|_|_|     |
//  _|    _|  _|        _|    _|        _|      _|        _|  _|    _|  _|    _|  _|    _|  _|        _|           |
//  _|_|_|    _|_|_|_|    _|_|    _|_|_|        _|        _|  _|    _|    _|_|_|  _|    _|    _|_|_|    _|_|_|     |
// =================================================================================================================
// ========================= DEUS (DEUS) =========================
// ===============================================================
// DEUS Finance: https://github.com/DeusFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Vahid Gh: https://github.com/vahid-dev
// SAYaghoubnejad: https://github.com/SAYaghoubnejad

// Reviewer(s) / Contributor(s)
// Sam Sun: https://github.com/samczsun

import "../Common/Context.sol";
import "../ERC20/ERC20Custom.sol";
import "../ERC20/IERC20.sol";
import "../DEI/DEI.sol";
import "../Governance/AccessControl.sol";

contract DEUSToken is ERC20Custom, AccessControl {

    /* ========== STATE VARIABLES ========== */

    string public symbol;
    string public name;
    uint8 public constant decimals = 18;

    uint256 public constant genesis_supply = 166670e18; // 166670 is printed upon genesis

    DEIStablecoin private DEI;

    bytes32 public constant TRUSTY_ROLE = keccak256("TRUSTY_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /* ========== MODIFIERS ========== */

    modifier onlyPoolsOrMinters() {
        require(
            DEI.dei_pools(msg.sender) == true || hasRole(MINTER_ROLE, msg.sender),
            "DEUS: Only dei pools or minters are allowed to do this operation"
        );
        _;
    }

    modifier onlyPools() {
        require(
            DEI.dei_pools(msg.sender) == true,
            "DEUS: Only dei pools are allowed to do this operation"
        );
        _;
    }

    modifier onlyByTrusty() {
        require(hasRole(TRUSTY_ROLE, msg.sender), "DEUS: You are not trusty");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        string memory _name,
        string memory _symbol,
        address _creator_address,
        address _trusty_address
    ) {
        require(_creator_address != address(0), "DEUS::constructor: zero address detected");  
        name = _name;
        symbol = _symbol;
        _setupRole(DEFAULT_ADMIN_ROLE, _trusty_address);
        _setupRole(TRUSTY_ROLE, _trusty_address);
        _mint(_creator_address, genesis_supply);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Change name + symbol of Token
	function setNameAndSymbol(string memory _name, string memory _symbol) external onlyByTrusty {
		name = _name;
		symbol = _symbol;
	}

    function setDEIAddress(address dei_contract_address)
        external
        onlyByTrusty
    {
        require(dei_contract_address != address(0), "DEUS::setDEIAddress: Zero address detected");

        DEI = DEIStablecoin(dei_contract_address);

        emit DEIAddressSet(dei_contract_address);
    }

    function mint(address to, uint256 amount) public onlyPoolsOrMinters {
        _mint(to, amount);
    }

    // This function is what other dei pools will call to mint new DEUS (similar to the DEI mint) and staking contracts can call this function too.
    function pool_mint(address m_address, uint256 m_amount) external onlyPoolsOrMinters {
        super._mint(m_address, m_amount);
        emit DEUSMinted(address(this), m_address, m_amount);
    }

    // This function is what other dei pools will call to burn DEUS
    function pool_burn_from(address b_address, uint256 b_amount)
        external
        onlyPools
    {
        super._burnFrom(b_address, b_amount);
        emit DEUSBurned(b_address, address(this), b_amount);
    }

    /* ========== EVENTS ========== */
    // Track DEUS burned
    event DEUSBurned(address indexed from, address indexed to, uint256 amount);
    // Track DEUS minted
    event DEUSMinted(address indexed from, address indexed to, uint256 amount);
    event DEIAddressSet(address addr);
}

//Dar panah khoda