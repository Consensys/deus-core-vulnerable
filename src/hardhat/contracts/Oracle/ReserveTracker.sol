/*
// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

// =================================================================================================================
//  _|_|_|    _|_|_|_|  _|    _|    _|_|_|      _|_|_|_|  _|                                                       |
//  _|    _|  _|        _|    _|  _|            _|            _|_|_|      _|_|_|  _|_|_|      _|_|_|    _|_|       |
//  _|    _|  _|_|_|    _|    _|    _|_|        _|_|_|    _|  _|    _|  _|    _|  _|    _|  _|        _|_|_|_|     |
//  _|    _|  _|        _|    _|        _|      _|        _|  _|    _|  _|    _|  _|    _|  _|        _|           |
//  _|_|_|    _|_|_|_|    _|_|    _|_|_|        _|        _|  _|    _|    _|_|_|  _|    _|    _|_|_|    _|_|_|     | 
// =================================================================================================================
// ====================================================================
// =========================== ReserveTracker =========================
// ====================================================================
// Deus Finance: https://github.com/DeusFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Vahid: https://github.com/vahid-dev
// SAYaghoubnejad: https://github.com/SAYaghoubnejad

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna

import "../Math/SafeMath.sol";
import "../Math/Math.sol";
import "../Uniswap/Interfaces/IUniswapV2Pair.sol";
import "../Staking/Owned.sol";

contract ReserveTracker is Owned {
	using SafeMath for uint256;

	// Various precisions
	uint256 public CONSULT_DEUS_DEC;
	uint256 public CONSULT_DEI_DEC;
	uint256 private PRICE_PRECISION = 1e6;

	// Contract addresses
	address private dei_contract_address;
	address private deus_contract_address;
	address public timelock_address;

	// The pair of which to get DEUS price from
	// address public deus_weth_oracle_address;
	// address public weth_collat_oracle_address;
	address private weth_address;
	// UniswapPairOracle private deus_weth_oracle;
	// UniswapPairOracle private weth_collat_oracle;
	uint256 public weth_collat_decimals;

	// Chainlink
	// ChainlinkFXSUSDPriceConsumer private chainlink_deus_oracle;
	uint256 public chainlink_deus_oracle_decimals;

	// Array of pairs for DEUS
	address[] public deus_pairs_array;

	// Mapping is also used for faster verification
	mapping(address => bool) public deus_pairs;

	uint256 public deus_reserves;

	// The pair of which to get DEI price from
	// address public dei_price_oracle_address;
	address public dei_pair_collateral_address;
	uint256 public dei_pair_collateral_decimals;
	// UniswapPairOracle private dei_price_oracle;
	// address public dei_metapool_address;
	// IMetaImplementationUSD private dei_metapool;

	// TWAP Related
	uint256 public last_timestamp;
	uint256[2] public old_twap;
	uint256 public dei_twap_price;
	uint256 public PERIOD = 3600; // 1-hour TWAP on deployment
	bool public twap_paused;

	// ========== MODIFIERS ==========

	modifier onlyByOwnerOrGovernance() {
		require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
		_;
	}

	// ========== CONSTRUCTOR ==========

	constructor(
		address _dei_contract_address,
		address _deus_contract_address,
		address _creator_address
	) Owned(_creator_address) {
		dei_contract_address = _dei_contract_address;
		deus_contract_address = _deus_contract_address;
	}

	// ========== VIEWS ==========

	// // Returns DEI price with 6 decimals of precision
	// function getDEIPrice() public view returns (uint256) {
	//     return dei_price_oracle.consult(dei_contract_address, CONSULT_DEI_DEC);
	// }

	// // Returns DEUS price with 6 decimals of precision
	// function getDEUSPrice() public view returns (uint256) {
	//     uint256 deus_weth_price = deus_weth_oracle.consult(deus_contract_address, 1e6);
	//     return weth_collat_oracle.consult(weth_address, CONSULT_DEUS_DEC).mul(deus_weth_price).div(1e6);
	// }

	// function getDEIPrice() public view returns (uint256) {
	// 	return dei_twap_price;
	// }

	// function getDEUSPrice() public view returns (uint256) {
	// 	return uint256(chainlink_deus_oracle.getLatestPrice()).mul(PRICE_PRECISION).div(10 ** chainlink_deus_oracle_decimals);
	// }

	function getDEUSReserves() public view returns (uint256) {
		uint256 total_deus_reserves = 0; 

		for (uint i = 0; i < deus_pairs_array.length; i++){ 
			// Exclude null addresses
			if (deus_pairs_array[i] != address(0)){
				if(IUniswapV2Pair(deus_pairs_array[i]).token0() == deus_contract_address) {
					(uint reserves0, , ) = IUniswapV2Pair(deus_pairs_array[i]).getReserves();
					total_deus_reserves = total_deus_reserves.add(reserves0);
				} else if (IUniswapV2Pair(deus_pairs_array[i]).token1() == deus_contract_address) {
					( , uint reserves1, ) = IUniswapV2Pair(deus_pairs_array[i]).getReserves();
					total_deus_reserves = total_deus_reserves.add(reserves1);
				}
			}
		}

		return total_deus_reserves;
	}

	// ========== PUBLIC MUTATIVE FUNCTIONS ==========

	function refreshDEICurveTWAP() public returns (uint256) {
		require(twap_paused == false, "TWAP has been paused");
		uint256 time_elapsed = (block.timestamp).sub(last_timestamp);
		require(time_elapsed >= PERIOD, 'ReserveTracker: PERIOD_NOT_ELAPSED');
		uint256[2] memory new_twap = dei_metapool.get_price_cumulative_last();
		uint256[2] memory balances = dei_metapool.get_twap_balances(old_twap, new_twap, time_elapsed);
		last_timestamp = block.timestamp;
		old_twap = new_twap;
		dei_twap_price = dei_metapool.get_dy(1, 0, 1e18, balances).mul(1e6).div(dei_metapool.get_virtual_price());
		return dei_twap_price;
	}

	// ========== RESTRICTED FUNCTIONS ==========

	function toggleCurveTWAP(bool _state) external onlyByOwnerOrGovernance {
		twap_paused = _state;
	}

	// Adds collateral addresses supported, such as tether and busd, must be ERC20 
	function addDEUSPair(address pair_address) public onlyByOwnerOrGovernance {
		require(deus_pairs[pair_address] == false, "Address already exists");
		deus_pairs[pair_address] = true; 
		deus_pairs_array.push(pair_address);
	}

	// Remove a pool 
	function removeDEUSPair(address pair_address) public onlyByOwnerOrGovernance {
		require(deus_pairs[pair_address] == true, "Address nonexistant");
		
		// Delete from the mapping
		delete deus_pairs[pair_address];

		// 'Delete' from the array by setting the address to 0x0
		for (uint i = 0; i < deus_pairs_array.length; i++){ 
			if (deus_pairs_array[i] == pair_address) {
				deus_pairs_array[i] = address(0); // This will leave a null in the array and keep the indices the same
				break;
			}
		}
	}
}
*/