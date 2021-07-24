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
// =========================== PIDController ==========================
// ====================================================================
// Deus Finance: https://github.com/DeusFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Vahid: https://github.com/vahid-dev
// SAYaghoubnejad: https://github.com/SAYaghoubnejad

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna

import '../DEUS/DEUS.sol';
import "../Math/SafeMath.sol";
import "./ReserveTracker.sol";


contract PIDController is Owned {
	using SafeMath for uint256;

	// Instances
	DEIStablecoin private DEI;
	DEUSToken private DEUS;
	ReserveTracker private reserve_tracker;
	IMetaImplementationUSD private dei_metapool;

	// DEI and DEUS addresses
	address private dei_contract_address;
	address private deus_contract_address;

	// Misc addresses
	address public reserve_tracker_address;
	address private dei_metapool_address;

	// 6 decimals of precision
	uint256 public growth_ratio;
	uint256 public dei_step;
	uint256 public GR_top_band;
	uint256 public GR_bottom_band;

	// Bands
	uint256 public DEI_top_band;
	uint256 public DEI_bottom_band;

	// Time-related
	uint256 public internal_cooldown;
	uint256 public last_update;
	
	// Booleans
	bool public is_active;
	bool public use_growth_ratio;
	bool public collateral_ratio_paused;
	bool public FIP_6;

	// ========== MODIFIERS ==========

	modifier onlyByOwnerOrGovernance() {
		require(msg.sender == owner, "PIDController: You are not owner");
		_;
	}

	// ========== CONSTRUCTOR ==========

	constructor(
		address _dei_contract_address,
		address _deus_contract_address,
		address _creator_address,
		address _reserve_tracker_address
	) Owned(_creator_address) {
		dei_contract_address = _dei_contract_address;
		deus_contract_address = _deus_contract_address;
		reserve_tracker_address = _reserve_tracker_address;
		reserve_tracker = ReserveTracker(reserve_tracker_address);
		dei_step = 2500;
		DEI = DEIStablecoin(dei_contract_address);
		DEUS = DEUSToken(deus_contract_address);

		// Upon genesis, if GR changes by more than 1% percent, enable change of collateral ratio
		GR_top_band = 1000;
		GR_bottom_band = 1000; 
		is_active = false;
	}

	// ========== PUBLIC MUTATIVE FUNCTIONS ==========
	
	function refreshCollateralRatio() public {
		require(collateral_ratio_paused == false, "Collateral Ratio has been paused");
		uint256 time_elapsed = (block.timestamp).sub(last_update);
		require(time_elapsed >= internal_cooldown, "internal cooldown not passed");
		uint256 deus_reserves = reserve_tracker.getDEUSReserves();
		uint256 deus_price = reserve_tracker.getDEUSPrice();
		
		uint256 deus_liquidity = (deus_reserves.mul(deus_price)); // Has 6 decimals of precision

		uint256 dei_supply = DEI.totalSupply();
		
		// Get the DEI TWAP on Curve Metapool
		uint256 dei_price = reserve_tracker.dei_twap_price();

		uint256 new_growth_ratio = deus_liquidity.div(dei_supply); // (E18 + E6) / E18

		uint256 last_collateral_ratio = DEI.global_collateral_ratio();
		uint256 new_collateral_ratio = last_collateral_ratio;

		if(FIP_6){
			require(dei_price > DEI_top_band || dei_price < DEI_bottom_band, "Use PIDController when DEI is outside of peg");
		}

		// First, check if the price is out of the band
		if(dei_price > DEI_top_band){
			new_collateral_ratio = last_collateral_ratio.sub(dei_step);
		} else if (dei_price < DEI_bottom_band){
			new_collateral_ratio = last_collateral_ratio.add(dei_step);

		// Else, check if the growth ratio has increased or decreased since last update
		} else if(use_growth_ratio){
			if(new_growth_ratio > growth_ratio.mul(1e6 + GR_top_band).div(1e6)){
				new_collateral_ratio = last_collateral_ratio.sub(dei_step);
			} else if (new_growth_ratio < growth_ratio.mul(1e6 - GR_bottom_band).div(1e6)){
				new_collateral_ratio = last_collateral_ratio.add(dei_step);
			}
		}

		growth_ratio = new_growth_ratio;
		last_update = block.timestamp;

		// No need for checking CR under 0 as the last_collateral_ratio.sub(dei_step) will throw 
		// an error above in that case
		if(new_collateral_ratio > 1e6){
			new_collateral_ratio = 1e6;
		}

		if(is_active){
			uint256 delta_collateral_ratio;
			if(new_collateral_ratio > last_collateral_ratio){
				delta_collateral_ratio = new_collateral_ratio - last_collateral_ratio;
				DEI.setPriceTarget(0); // Set to zero to increase CR
				emit DEIdecollateralize(new_collateral_ratio);
			} else if (new_collateral_ratio < last_collateral_ratio){
				delta_collateral_ratio = last_collateral_ratio - new_collateral_ratio;
				DEI.setPriceTarget(1000e6); // Set to high value to decrease CR
				emit DEIrecollateralize(new_collateral_ratio);
			}

			DEI.setDEIStep(delta_collateral_ratio); // Change by the delta
			uint256 cooldown_before = DEI.refresh_cooldown(); // Note the existing cooldown period
			DEI.setRefreshCooldown(0); // Unlock the CR cooldown

			DEI.refreshCollateralRatio(); // Refresh CR

			// Reset params
			DEI.setDEIStep(0);
			DEI.setRefreshCooldown(cooldown_before); // Set the cooldown period to what it was before, or until next controller refresh
			DEI.setPriceTarget(1e6);           
		}
	}

	// ========== RESTRICTED FUNCTIONS ==========

	function activate(bool _state) external onlyByOwnerOrGovernance {
		is_active = _state;
	}

	function useGrowthRatio(bool _use_growth_ratio) external onlyByOwnerOrGovernance {
		use_growth_ratio = _use_growth_ratio;
	}

	function setReserveTracker(address _reserve_tracker_address) external onlyByOwnerOrGovernance {
		reserve_tracker_address = _reserve_tracker_address;
		reserve_tracker = ReserveTracker(_reserve_tracker_address);
	}

	function setMetapool(address _metapool_address) external onlyByOwnerOrGovernance {
		dei_metapool_address = _metapool_address;
		dei_metapool = IMetaImplementationUSD(_metapool_address);
	}

	// As a percentage added/subtracted from the previous; e.g. top_band = 4000 = 0.4% -> will decollat if GR increases by 0.4% or more
	function setGrowthRatioBands(uint256 _GR_top_band, uint256 _GR_bottom_band) external onlyByOwnerOrGovernance {
		GR_top_band = _GR_top_band;
		GR_bottom_band = _GR_bottom_band;
	}

	function setInternalCooldown(uint256 _internal_cooldown) external onlyByOwnerOrGovernance {
		internal_cooldown = _internal_cooldown;
	}

	function setDEIStep(uint256 _new_step) external onlyByOwnerOrGovernance {
		dei_step = _new_step;
	}

	function setPriceBands(uint256 _top_band, uint256 _bottom_band) external onlyByOwnerOrGovernance {
		DEI_top_band = _top_band;
		DEI_bottom_band = _bottom_band;
	}

	function setTimelock(address new_timelock) external onlyByOwnerOrGovernance {
		require(new_timelock != address(0), "Timelock address cannot be 0");
		timelock_address = new_timelock;
	}

	function toggleCollateralRatio(bool _is_paused) external onlyByOwnerOrGovernance {
		collateral_ratio_paused = _is_paused;
	}

	function activateFIP6(bool _activate) external onlyByOwnerOrGovernance {
		FIP_6 = _activate;
	}


	// ========== EVENTS ==========
	event DEIdecollateralize(uint256 new_collateral_ratio);
	event DEIrecollateralize(uint256 new_collateral_ratio);
}
*/