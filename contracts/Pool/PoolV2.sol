// Be name Khoda
// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;
pragma abicoder v2;
// =================================================================================================================
//  _|_|_|    _|_|_|_|  _|    _|    _|_|_|      _|_|_|_|  _|                                                       |
//  _|    _|  _|        _|    _|  _|            _|            _|_|_|      _|_|_|  _|_|_|      _|_|_|    _|_|       |
//  _|    _|  _|_|_|    _|    _|    _|_|        _|_|_|    _|  _|    _|  _|    _|  _|    _|  _|        _|_|_|_|     |
//  _|    _|  _|        _|    _|        _|      _|        _|  _|    _|  _|    _|  _|    _|  _|        _|           |
//  _|_|_|    _|_|_|_|    _|_|    _|_|_|        _|        _|  _|    _|    _|_|_|  _|    _|    _|_|_|    _|_|_|     |
// =================================================================================================================
// ========================== MinterPoolV2 ========================
// ================================================================
// DEUS Finance: https://github.com/DeusFinance

// Primary Author(s)
// Vahid: https://github.com/vahid-dev

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IPoolLibrary.sol";
import "./interfaces/IDEI.sol";

/// @title DEI Minter Pool V2
/// @author DEUS Finance
/// @notice Mint / Burn Fractional DEI
/// @dev Stablecoin's minter pool, COLLATERAL_PRICE is $1
contract DEIPool is AccessControl {
	struct RecollateralizeDEI {
		uint256 collateral_amount;
		uint256 pool_collateral_price;
		uint256[] collateral_price;
		uint256 deus_current_price;
		uint256 expire_block;
		bytes[] sigs;
	}

	struct MintFD_Params {
        uint256 deus_price_usd;
        uint256 col_price_usd;
        uint256 collateral_amount;
        uint256 col_ratio;
    }

    struct BuybackDEUS_Params {
        uint256 excess_collateral_dollar_value_d18;
        uint256 deus_price_usd;
        uint256 col_price_usd;
        uint256 DEUS_amount;
    }

	/* ========== STATE VARIABLES ========== */
	address public collateral;
	address public dei;
	address public deus;

	uint256 public mintFee;
	uint256 public redeemFee;
	uint256 public buyback_fee;
	uint256 public recollat_fee;

	mapping(address => uint256) public redeem_deus_balances;
	mapping(address => uint256) public redeem_collateral_balances;
	uint256 public unclaimed_pool_deus;
	uint256 public unclaimed_pool_collateral;
	mapping(address => uint256) public last_redeemed;

	// Constants for various precisions
	uint256 private constant PRICE_PRECISION = 1e6;
	uint256 private constant COLLATERAL_RATIO_PRECISION = 1e6;
	uint256 private constant COLLATERAL_RATIO_MAX = 1e6;
	uint256 private constant COLLATERAL_PRICE = 1e6;

	// Number of decimals needed to get to 18
	uint256 private immutable missing_decimals;

	// Pool_ceiling is the total units of collateral that a pool contract can hold
	uint256 public pool_ceiling = 0;

	// Bonus rate on DEUS minted during recollateralizeDEI(); 6 decimals of precision, set to 0.75% on genesis
	uint256 public bonus_rate = 7500;

	// Number of blocks to wait before being able to collectRedemption()
	uint256 public deus_redemption_delay;
	uint256 public collateral_redemption_delay;

	// Minting/Redeeming fees goes to daoWallet
	uint256 public dao_share = 0;

	address public pool_library;

	// AccessControl Roles
	bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
	bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
	bytes32 public constant DAO_SHARE_COLLECTOR_ROLE = keccak256("DAO_SHARE_COLLECTOR_ROLE");
	bytes32 public constant PARAMETER_SETTER_ROLE = keccak256("PARAMETER_SETTER_ROLE");

	// AccessControl state variables
	bool public mint_paused = false;
	bool public redeem_paused = false;
	bool public recollateralize_paused = false;
	bool public buy_back_paused = false;

	/* ========== MODIFIERS ========== */
	modifier notRedeemPaused() {
		require(!redeem_paused, "Pool: REDEEM_PAUSED");
		_;
	}

	modifier notMintPaused() {
		require(!mint_paused, "Pool: MINT_PAUSED");
		_;
	}

	/* ========== CONSTRUCTOR ========== */
	constructor(
		address pool_library_,
		address dei_,
		address deus_,
		address collateral_,
		address admin_address,
		uint256 pool_ceiling_
	) {
		require(
			(pool_library_ != address(0)) &&
				(dei_ != address(0)) &&
				(deus_ != address(0)) &&
				(collateral_ != address(0)) &&
				(admin_address != address(0)),
			"Pool: ZERO_ADDRESS_DETECTED"
		);
		pool_library = pool_library_;
		dei = dei_;
		deus = deus_;
		collateral = collateral_;
		pool_ceiling = pool_ceiling_;
		missing_decimals = uint256(18) - IERC20(collateral).decimals();
		_setupRole(DEFAULT_ADMIN_ROLE, admin_address);
	}

	/* ========== VIEWS ========== */

	/// @notice calculate dollar value of collateral held in this DEI pool
	/// @param collat_usd_price price of collateral in USD
	/// @return collateral dollar value of collateral held in the pool
	function collatDollarBalance(uint256 collat_usd_price) public view returns (uint256 collateral_balance) {
		collateral_balance = ((IERC20(collateral).balanceOf(address(this)) - unclaimed_pool_collateral) * (10 ** missing_decimals) * collat_usd_price) / PRICE_PRECISION;
	}

	/// @notice calculate excess collateral held in this DEI pool, compared to what is needed to maintain the global collateral ratio
	/// @param collat_usd_price array of prices of collateral in USD
	/// @return excess_collat_dv the value of excess collateral held in this DEI pool
	function availableExcessCollatDV(uint256[] memory collat_usd_price) external view returns (uint256 excess_collat_dv) {
		uint256 total_supply = IDEI(dei).totalSupply();
		uint256 global_collateral_ratio = IDEI(dei).global_collateral_ratio();
		uint256 global_collat_value = IDEI(dei).globalCollateralValue(collat_usd_price);

		if (global_collateral_ratio > COLLATERAL_RATIO_PRECISION)
			global_collateral_ratio = COLLATERAL_RATIO_PRECISION; // Handles an overcollateralized contract with CR > 1
		uint256 required_collat_dollar_value_d18 = (total_supply * global_collateral_ratio) / (COLLATERAL_RATIO_PRECISION); // Calculates collateral needed to back each 1 DEI with $1 of collateral at current collat ratio
		if (global_collat_value > required_collat_dollar_value_d18)
			excess_collat_dv = global_collat_value - required_collat_dollar_value_d18;
		else excess_collat_dv = 0;
	}

	function _get_chainId() internal view returns (uint256 id) {
		assembly {
			id := chainid()
		}
	}

	/* ========== PUBLIC FUNCTIONS ========== */

	// We separate out the 1t1, fractional and algorithmic minting functions for gas efficiency
	function mint1t1DEI(uint256 collateral_amount)
		external
		notMintPaused
		returns (uint256 dei_amount_d18)
	{
		require(IDEI(dei).global_collateral_ratio() >= COLLATERAL_RATIO_MAX, "Pool: INVALID_RATIO");
		require(IERC20(collateral).balanceOf(address(this)) - unclaimed_pool_collateral +  collateral_amount <= pool_ceiling, "Pool: CEILING_REACHED");

		uint256 collateral_amount_d18 = collateral_amount * (10 ** missing_decimals);
		dei_amount_d18 = IPoolLibrary(pool_library).calcMint1t1DEI(
			COLLATERAL_PRICE,
			collateral_amount_d18
		); //1 DEI for each $1 worth of collateral

		dei_amount_d18 = (dei_amount_d18 * (uint256(1e6) - mintFee)) / 1e6; //remove precision at the end

		IERC20(collateral).safeTransferFrom(
			msg.sender,
			address(this),
			collateral_amount
		);

		dao_share += dei_amount_d18 *  mintFee / 1e6;
		IDEI(dei).pool_mint(msg.sender, dei_amount_d18);
	}

	// 0% collateral-backed
	function mintAlgorithmicDEI(
		uint256 deusAmount,
		uint256 deusPrice,
		uint256 expireBlock,
		bytes[] calldata sigs
	) external notMintPaused returns (uint256 deiAmount) {
		require(IDEI(dei).global_collateral_ratio() == 0, "Pool: INVALID_RATIO");
		require(expireBlock >= block.number, "Pool: EXPIRED_SIGNATURE");
		bytes32 sighash = keccak256(abi.encodePacked(deus, deusPrice, expireBlock, _get_chainId()));
		require(IDEI(dei).verify_price(sighash, sigs), "Pool: UNVERIFIED_SIGNATURE");

		deiAmount = IPoolLibrary(pool_library).calcMintAlgorithmicDEI(
			deusPrice, // X DEUS / 1 USD
			deusAmount
		);

		deiAmount = (deiAmount * (uint256(1e6) - (mintFee))) / (1e6);
		daoShare += deiAmount *  mintFee / 1e6;

		IDEUSToken(deus).pool_burn_from(msg.sender, deus_amount_d18);
		IDEIStablecoin(dei).pool_mint(msg.sender, dei_amount_d18);
	}

	// Will fail if fully collateralized or fully algorithmic
	// > 0% and < 100% collateral-backed
	function mintFractionalDEI(
		uint256 collateral_amount,
		uint256 deus_amount,
		uint256 collateral_price,
		uint256 deus_current_price,
		uint256 expireBlock,
		bytes[] calldata sigs
	) external notMintPaused returns (uint256 mint_amount) {
		uint256 global_collateral_ratio = IDEI(dei).global_collateral_ratio();
		require(
			global_collateral_ratio < COLLATERAL_RATIO_MAX && global_collateral_ratio > 0,
			"Collateral ratio needs to be between .000001 and .999999"
		);
		require(
			collateral_token.balanceOf(address(this)) - unclaimedPoolCollateral + collateral_amount <= pool_ceiling,
			"Pool ceiling reached, no more DEI can be minted with this collateral"
		);

		require(expireBlock >= block.number, "POOL::mintFractionalDEI: signature is expired.");
		bytes32 sighash = keccak256(abi.encodePacked(collateral, COLLATERAL_PRICE, deus, deus_current_price, expireBlock, _get_chainId()));
		require(IDEI(dei).verify_price(sighash, sigs), "POOL::mintFractionalDEI: invalid signatures");

		MintFD_Params memory input_params;

		// Blocking is just for solving stack depth problem
		{
			uint256 collateral_amount_d18 = collateral_amount * (10**missing_decimals);
			input_params = IPoolLibrary(pool_library).MintFD_Params(
											deus_current_price,
											COLLATERAL_PRICE,
											collateral_amount_d18,
											global_collateral_ratio
										);
		}						

		uint256 deus_needed;
		(mint_amount, deus_needed) = IPoolLibrary(pool_library).calcMintFractionalDEI(input_params);
		require(deus_needed <= deus_amount, "Not enough DEUS inputted");
		
		mint_amount = (mint_amount * (uint256(1e6) - mintFee)) / (1e6);

		IDEUSToken(deus).pool_burn_from(msg.sender, deus_needed);
		TransferHelper.safeTransferFrom(
			address(collateral_token),
			msg.sender,
			address(this),
			collateral_amount
		);

		daoShare += mint_amount *  mintFee / 1e6;
		IDEI(dei).pool_mint(msg.sender, mint_amount);
	}

	// Redeem collateral. 100% collateral-backed
	function redeem1t1DEI(uint256 DEI_amount, uint256 COLLATERAL_PRICE, uint256 expireBlock, bytes[] calldata sigs)
		external
		notRedeemPaused
	{
		require(
			IDEI(dei).global_collateral_ratio() == COLLATERAL_RATIO_MAX,
			"Collateral ratio must be == 1"
		);

		require(expireBlock >= block.number, "POOL::mintAlgorithmicDEI: signature is expired.");
		bytes32 sighash = keccak256(abi.encodePacked(collateral, COLLATERAL_PRICE, expireBlock, _get_chainId()));
		require(IDEI(dei).verify_price(sighash, sigs), "POOL::redeem1t1DEI: invalid signatures");

		// Need to adjust for decimals of collateral
		uint256 DEI_amount_precision = DEI_amount / (10**missing_decimals);
		uint256 collateral_needed = IPoolLibrary(pool_library).calcRedeem1t1DEI(
			COLLATERAL_PRICE,
			DEI_amount_precision
		);

		collateral_needed = (collateral_needed * (uint256(1e6) - redeemFee)) / (1e6);
		require(
			collateral_needed <= collateral_token.balanceOf(address(this)) - unclaimedPoolCollateral,
			"Not enough collateral in pool"
		);

		redeemCollateralBalances[msg.sender] = redeemCollateralBalances[msg.sender] + collateral_needed;
		unclaimedPoolCollateral = unclaimedPoolCollateral + collateral_needed;
		lastRedeemed[msg.sender] = block.number;

		daoShare += DEI_amount * redeemFee / 1e6;
		// Move all external functions to the end
		IDEI(dei).pool_burn_from(msg.sender, DEI_amount);
	}

	// Will fail if fully collateralized or algorithmic
	// Redeem DEI for collateral and DEUS. > 0% and < 100% collateral-backed
	function redeemFractionalDEI(
		uint256 DEI_amount,
		uint256 COLLATERAL_PRICE, 
		uint256 deus_current_price,
		uint256 expireBlock,
		bytes[] calldata sigs
	) external notRedeemPaused {
		uint256 global_collateral_ratio = IDEI(dei).global_collateral_ratio();
		require(
			global_collateral_ratio < COLLATERAL_RATIO_MAX && global_collateral_ratio > 0,
			"POOL::redeemFractionalDEI: Collateral ratio needs to be between .000001 and .999999"
		);

		require(expireBlock >= block.number, "DEI::redeemFractionalDEI: signature is expired");
		bytes32 sighash = keccak256(abi.encodePacked(collateral, COLLATERAL_PRICE, deus, deus_current_price, expireBlock, _get_chainId()));
		require(IDEI(dei).verify_price(sighash, sigs), "POOL::redeemFractionalDEI: invalid signatures");

		// Blocking is just for solving stack depth problem
		uint256 deus_amount;
		uint256 collateral_amount;
		{
			uint256 col_price_usd = COLLATERAL_PRICE;

			uint256 DEI_amount_post_fee = (DEI_amount * (uint256(1e6) - redeemFee)) / (PRICE_PRECISION);

			uint256 deus_dollar_value_d18 = DEI_amount_post_fee - ((DEI_amount_post_fee * global_collateral_ratio) / (PRICE_PRECISION));
			deus_amount = deus_dollar_value_d18 * (PRICE_PRECISION) / (deus_current_price);

			// Need to adjust for decimals of collateral
			uint256 DEI_amount_precision = DEI_amount_post_fee / (10**missing_decimals);
			uint256 collateral_dollar_value = (DEI_amount_precision * global_collateral_ratio) / PRICE_PRECISION;
			collateral_amount = (collateral_dollar_value * PRICE_PRECISION) / (col_price_usd);
		}
		require(
			collateral_amount <= collateral_token.balanceOf(address(this)) - unclaimedPoolCollateral,
			"Not enough collateral in pool"
		);

		redeemCollateralBalances[msg.sender] = redeemCollateralBalances[msg.sender] + collateral_amount;
		unclaimedPoolCollateral = unclaimedPoolCollateral + collateral_amount;

		redeemDEUSBalances[msg.sender] = redeemDEUSBalances[msg.sender] + deus_amount;
		unclaimedPoolDEUS = unclaimedPoolDEUS + deus_amount;

		lastRedeemed[msg.sender] = block.number;

		daoShare += DEI_amount * redeemFee / 1e6;
		// Move all external functions to the end
		IDEI(dei).pool_burn_from(msg.sender, DEI_amount);
		IDEUSToken(deus).pool_mint(address(this), deus_amount);
	}

	// Redeem DEI for DEUS. 0% collateral-backed
	function redeemAlgorithmicDEI(
		uint256 DEI_amount,
		uint256 deus_current_price,
		uint256 expireBlock,
		bytes[] calldata sigs
	) external notRedeemPaused {
		require(IDEI(dei).global_collateral_ratio() == 0, "POOL::redeemAlgorithmicDEI: Collateral ratio must be 0");

		require(expireBlock >= block.number, "DEI::redeemAlgorithmicDEI: signature is expired.");
		bytes32 sighash = keccak256(abi.encodePacked(deus, deus_current_price, expireBlock, _get_chainId()));
		require(IDEI(dei).verify_price(sighash, sigs), "POOL::redeemAlgorithmicDEI: invalid signatures");

		uint256 deus_dollar_value_d18 = DEI_amount;

		deus_dollar_value_d18 = (deus_dollar_value_d18 * (uint256(1e6) - redeemFee)) / 1e6; //apply fees

		uint256 deus_amount = (deus_dollar_value_d18 * (PRICE_PRECISION)) / deus_current_price;

		redeemDEUSBalances[msg.sender] = redeemDEUSBalances[msg.sender] + deus_amount;
		unclaimedPoolDEUS = unclaimedPoolDEUS + deus_amount;

		lastRedeemed[msg.sender] = block.number;

		daoShare += DEI_amount * redeemFee / 1e6;
		// Move all external functions to the end
		IDEI(dei).pool_burn_from(msg.sender, DEI_amount);
		IDEUSToken(deus).pool_mint(address(this), deus_amount);
	}

	// After a redemption happens, transfer the newly minted DEUS and owed collateral from this pool
	// contract to the user. Redemption is split into two functions to prevent flash loans from being able
	// to take out DEI/collateral from the system, use an AMM to trade the new price, and then mint back into the system.
	function collectRedemption() external {
		require(
			(lastRedeemed[msg.sender] + redemption_delay) <= block.number,
			"POOL::collectRedemption: Must wait for redemption_delay blocks before collecting redemption"
		);
		bool sendDEUS = false;
		bool sendCollateral = false;
		uint256 DEUSAmount = 0;
		uint256 CollateralAmount = 0;

		// Use Checks-Effects-Interactions pattern
		if (redeemDEUSBalances[msg.sender] > 0) {
			DEUSAmount = redeemDEUSBalances[msg.sender];
			redeemDEUSBalances[msg.sender] = 0;
			unclaimedPoolDEUS = unclaimedPoolDEUS - DEUSAmount;

			sendDEUS = true;
		}

		if (redeemCollateralBalances[msg.sender] > 0) {
			CollateralAmount = redeemCollateralBalances[msg.sender];
			redeemCollateralBalances[msg.sender] = 0;
			unclaimedPoolCollateral = unclaimedPoolCollateral - CollateralAmount;
			sendCollateral = true;
		}

		if (sendDEUS) {
			TransferHelper.safeTransfer(address(deus), msg.sender, DEUSAmount);
		}
		if (sendCollateral) {
			TransferHelper.safeTransfer(
				address(collateral_token),
				msg.sender,
				CollateralAmount
			);
		}
	}

	// When the protocol is recollateralizing, we need to give a discount of DEUS to hit the new CR target
	// Thus, if the target collateral ratio is higher than the actual value of collateral, minters get DEUS for adding collateral
	// This function simply rewards anyone that sends collateral to a pool with the same amount of DEUS + the bonus rate
	// Anyone can call this function to recollateralize the protocol and take the extra DEUS value from the bonus rate as an arb opportunity
	function recollateralizeDEI(RecollateralizeDEI memory inputs) external {
		require(recollateralizePaused == false, "POOL::recollateralizeDEI: Recollateralize is paused");

		require(inputs.expireBlock >= block.number, "POOL::recollateralizeDEI: signature is expired.");
		bytes32 sighash = keccak256(abi.encodePacked(
										collateral, 
										inputs.COLLATERAL_PRICE,
										deus, 
										inputs.deus_current_price, 
										inputs.expireBlock,
										_get_chainId()
									));
		require(IDEI(dei).verify_price(sighash, inputs.sigs), "POOL::recollateralizeDEI: invalid signatures");

		uint256 collateral_amount_d18 = inputs.collateral_amount * (10**missing_decimals);

		uint256 dei_total_supply = IDEI(dei).totalSupply();
		uint256 global_collateral_ratio = IDEI(dei).global_collateral_ratio();
		uint256 global_collat_value = IDEI(dei).globalCollateralValue(inputs.COLLATERAL_PRICE);

		(uint256 collateral_units, uint256 amount_to_recollat) = IPoolLibrary(pool_library).calcRecollateralizeDEIInner(
																				collateral_amount_d18,
																				inputs.COLLATERAL_PRICE[inputs.COLLATERAL_PRICE.length - 1], // pool collateral price exist in last index
																				global_collat_value,
																				dei_total_supply,
																				global_collateral_ratio
																			);

		uint256 collateral_units_precision = collateral_units / (10**missing_decimals);

		uint256 deus_paid_back = (amount_to_recollat * (uint256(1e6) + bonus_rate - recollat_fee)) / inputs.deus_current_price;

		TransferHelper.safeTransferFrom(
			address(collateral_token),
			msg.sender,
			address(this),
			collateral_units_precision
		);
		IDEUSToken(deus).pool_mint(msg.sender, deus_paid_back);
	}

	// Function can be called by an DEUS holder to have the protocol buy back DEUS with excess collateral value from a desired collateral pool
	// This can also happen if the collateral ratio > 1
	function buyBackDEUS(
		uint256 DEUS_amount,
		uint256[] memory COLLATERAL_PRICE,
		uint256 deus_current_price,
		uint256 expireBlock,
		bytes[] calldata sigs
	) external {
		require(buyBackPaused == false, "POOL::buyBackDEUS: Buyback is paused");
		require(expireBlock >= block.number, "DEI::buyBackDEUS: signature is expired.");
		bytes32 sighash = keccak256(abi.encodePacked(
										collateral,
										COLLATERAL_PRICE,
										deus,
										deus_current_price,
										expireBlock,
										_get_chainId()));
		require(IDEI(dei).verify_price(sighash, sigs), "POOL::buyBackDEUS: invalid signatures");

		BuybackDEUS_Params memory input_params = IPoolLibrary(pool_library).BuybackDEUS_Params(
													availableExcessCollatDV(COLLATERAL_PRICE),
													deus_current_price,
													COLLATERAL_PRICE[COLLATERAL_PRICE.length - 1], // pool collateral price exist in last index
													DEUS_amount
												);

		uint256 collateral_equivalent_d18 = (IPoolLibrary(pool_library).calcBuyBackDEUS(input_params) * (uint256(1e6) - buyback_fee)) / (1e6);
		uint256 collateral_precision = collateral_equivalent_d18 / (10**missing_decimals);

		// Give the sender their desired collateral and burn the DEUS
		IDEUSToken(deus).pool_burn_from(msg.sender, DEUS_amount);
		TransferHelper.safeTransfer(
			address(collateral_token),
			msg.sender,
			collateral_precision
		);
	}

	/* ========== RESTRICTED FUNCTIONS ========== */

	function collectDaoShare(uint256 amount, address to) external {
		require(hasRole(DAO_SHARE_COLLECTOR, msg.sender));
		require(amount <= daoShare, "amount<=daoShare");
		IDEI(dei).pool_mint(to, amount);
		daoShare -= amount;

		emit daoShareCollected(amount, to);
	}

	function emergencyWithdrawERC20(address token, uint amount, address to) external onlyTrusty {
		IERC20(token).transfer(to, amount);
	}

	function toggleMinting() external {
		require(hasRole(MINT_PAUSER, msg.sender));
		mintPaused = !mintPaused;

		emit MintingToggled(mintPaused);
	}

	function toggleRedeeming() external {
		require(hasRole(REDEEM_PAUSER, msg.sender));
		redeemPaused = !redeemPaused;

		emit RedeemingToggled(redeemPaused);
	}

	function toggleRecollateralize() external {
		require(hasRole(RECOLLATERALIZE_PAUSER, msg.sender));
		recollateralizePaused = !recollateralizePaused;

		emit RecollateralizeToggled(recollateralizePaused);
	}

	function toggleBuyBack() external {
		require(hasRole(BUYBACK_PAUSER, msg.sender));
		buyBackPaused = !buyBackPaused;

		emit BuybackToggled(buyBackPaused);
	}

}

//Dar panah khoda