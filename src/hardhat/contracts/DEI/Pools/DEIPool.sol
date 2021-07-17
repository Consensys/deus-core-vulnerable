// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

// =================================================================================================================
//  _|_|_|    _|_|_|_|  _|    _|    _|_|_|      _|_|_|_|  _|                                                       |
//  _|    _|  _|        _|    _|  _|            _|            _|_|_|      _|_|_|  _|_|_|      _|_|_|    _|_|       |
//  _|    _|  _|_|_|    _|    _|    _|_|        _|_|_|    _|  _|    _|  _|    _|  _|    _|  _|        _|_|_|_|     |
//  _|    _|  _|        _|    _|        _|      _|        _|  _|    _|  _|    _|  _|    _|  _|        _|           |
//  _|_|_|    _|_|_|_|    _|_|    _|_|_|        _|        _|  _|    _|    _|_|_|  _|    _|    _|_|_|    _|_|_|     | 
// =================================================================================================================
// ============================= DEIPool =============================
// ====================================================================
// DEUS Finance: https://github.com/DeusFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Vahid Gh: https://github.com/vahid-dev
// SAYaghoubnejad: https://github.com/SAYaghoubnejad

// Reviewer(s) / Contributor(s)
// Sam Sun: https://github.com/samczsun

import "../../Math/SafeMath.sol";
import '../../Uniswap/TransferHelper.sol';
import "../../Staking/Owned.sol";
import "../../DEUS/DEUS.sol";
import "../../DEI/DEI.sol";
import "../../ERC20/ERC20.sol";
import "../../Oracle/UniswapPairOracle.sol";
import "../../Governance/AccessControl.sol";
import "./DEIPoolLibrary.sol";

contract DEIPool is AccessControl, Owned {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    address private collateral_address;

    address private dei_contract_address;
    address private deus_contract_address;
    address private timelock_address;
    DEUSToken private deus;
    DEIStablecoin private DEI;

    UniswapPairOracle private collatEthOracle;
    address public collat_eth_oracle_address;
    address private weth_address;

    uint256 public minting_fee;
    uint256 public redemption_fee;
    uint256 public buyback_fee;
    uint256 public recollat_fee;

    mapping (address => uint256) public redeemDEUSBalances;
    mapping (address => uint256) public redeemCollateralBalances;
    uint256 public unclaimedPoolCollateral;
    uint256 public unclaimedPoolDEUS;
    mapping (address => uint256) public lastRedeemed;

    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_MAX = 1e6;

    // Number of decimals needed to get to 18
    uint256 private immutable missing_decimals;
    
    // Pool_ceiling is the total units of collateral that a pool contract can hold
    uint256 public pool_ceiling = 0;

    // Stores price of the collateral, if price is paused
    uint256 public pausedPrice = 0;

    // Bonus rate on DEUS minted during recollateralizeDEI(); 6 decimals of precision, set to 0.75% on genesis
    uint256 public bonus_rate = 7500;

    // Number of blocks to wait before being able to collectRedemption()
    uint256 public redemption_delay = 1;

    // AccessControl Roles
    bytes32 private constant MINT_PAUSER = keccak256("MINT_PAUSER");
    bytes32 private constant REDEEM_PAUSER = keccak256("REDEEM_PAUSER");
    bytes32 private constant BUYBACK_PAUSER = keccak256("BUYBACK_PAUSER");
    bytes32 private constant RECOLLATERALIZE_PAUSER = keccak256("RECOLLATERALIZE_PAUSER");
    bytes32 private constant COLLATERAL_PRICE_PAUSER = keccak256("COLLATERAL_PRICE_PAUSER");
    
    // AccessControl state variables
    bool public mintPaused = false;
    bool public redeemPaused = false;
    bool public recollateralizePaused = false;
    bool public buyBackPaused = false;
    bool public collateralPricePaused = false;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier notRedeemPaused() {
        require(redeemPaused == false, "Redeeming is paused");
        _;
    }

    modifier notMintPaused() {
        require(mintPaused == false, "Minting is paused");
        _;
    }
 
    /* ========== CONSTRUCTOR ========== */
    
    constructor(
        address _dei_contract_address,
        address _deus_contract_address,
        address _collateral_address,
        address _creator_address,
        address _timelock_address,
        uint256 _pool_ceiling
    ) public Owned(_creator_address){
        require(
            (_dei_contract_address != address(0))
            && (_deus_contract_address != address(0))
            && (_collateral_address != address(0))
            && (_creator_address != address(0))
            && (_timelock_address != address(0))
        , "Zero address detected"); 
        DEI = DEIStablecoin(_dei_contract_address);
        deus = DEUSToken(_deus_contract_address);
        dei_contract_address = _dei_contract_address;
        deus_contract_address = _deus_contract_address;
        collateral_address = _collateral_address;
        timelock_address = _timelock_address;
        collateral_token = ERC20(_collateral_address);
        pool_ceiling = _pool_ceiling;
        missing_decimals = uint(18).sub(collateral_token.decimals());

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        grantRole(MINT_PAUSER, timelock_address);
        grantRole(REDEEM_PAUSER, timelock_address);
        grantRole(RECOLLATERALIZE_PAUSER, timelock_address);
        grantRole(BUYBACK_PAUSER, timelock_address);
        grantRole(COLLATERAL_PRICE_PAUSER, timelock_address);
    }

    /* ========== VIEWS ========== */

    // Returns dollar value of collateral held in this DEI pool
    function collatDollarBalance() public view returns (uint256) {
        if(collateralPricePaused == true){
            return (collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral)).mul(10 ** missing_decimals).mul(pausedPrice).div(PRICE_PRECISION);
        } else {
            uint256 eth_usd_price = DEI.eth_usd_price();
            uint256 eth_collat_price = collatEthOracle.consult(weth_address, (PRICE_PRECISION * (10 ** missing_decimals)));

            uint256 collat_usd_price = eth_usd_price.mul(PRICE_PRECISION).div(eth_collat_price);
            return (collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral)).mul(10 ** missing_decimals).mul(collat_usd_price).div(PRICE_PRECISION); //.mul(getCollateralPrice()).div(1e6);    
        }
    }

    // Returns the value of excess collateral held in this DEI pool, compared to what is needed to maintain the global collateral ratio
    function availableExcessCollatDV() public view returns (uint256) {
        uint256 total_supply = DEI.totalSupply();
        uint256 global_collateral_ratio = DEI.global_collateral_ratio();
        uint256 global_collat_value = DEI.globalCollateralValue();

        if (global_collateral_ratio > COLLATERAL_RATIO_PRECISION) global_collateral_ratio = COLLATERAL_RATIO_PRECISION; // Handles an overcollateralized contract with CR > 1
        uint256 required_collat_dollar_value_d18 = (total_supply.mul(global_collateral_ratio)).div(COLLATERAL_RATIO_PRECISION); // Calculates collateral needed to back each 1 DEI with $1 of collateral at current collat ratio
        if (global_collat_value > required_collat_dollar_value_d18) return global_collat_value.sub(required_collat_dollar_value_d18);
        else return 0;
    }

    /* ========== PUBLIC FUNCTIONS ========== */
    
    // Returns the price of the pool collateral in USD
    function getCollateralPrice() public view returns (uint256) {
        if(collateralPricePaused == true){
            return pausedPrice;
        } else {
            uint256 eth_usd_price = DEI.eth_usd_price();
            return eth_usd_price.mul(PRICE_PRECISION).div(collatEthOracle.consult(weth_address, PRICE_PRECISION * (10 ** missing_decimals)));
        }
    }

    function setCollatETHOracle(address _collateral_weth_oracle_address, address _weth_address) external onlyByOwnerOrGovernance {
        collat_eth_oracle_address = _collateral_weth_oracle_address;
        collatEthOracle = UniswapPairOracle(_collateral_weth_oracle_address);
        weth_address = _weth_address;
    }

    // We separate out the 1t1, fractional and algorithmic minting functions for gas efficiency 
    function mint1t1DEI(uint256 collateral_amount, uint256 DEI_out_min) external notMintPaused {
        uint256 collateral_amount_d18 = collateral_amount * (10 ** missing_decimals);

        require(DEI.global_collateral_ratio() >= COLLATERAL_RATIO_MAX, "Collateral ratio must be >= 1");
        require((collateral_token.balanceOf(address(this))).sub(unclaimedPoolCollateral).add(collateral_amount) <= pool_ceiling, "[Pool's Closed]: Ceiling reached");
        
        (uint256 dei_amount_d18) = DEIPoolLibrary.calcMint1t1DEI(
            getCollateralPrice(),
            collateral_amount_d18
        ); //1 DEI for each $1 worth of collateral

        dei_amount_d18 = (dei_amount_d18.mul(uint(1e6).sub(minting_fee))).div(1e6); //remove precision at the end
        require(DEI_out_min <= dei_amount_d18, "Slippage limit reached");

        TransferHelper.safeTransferFrom(address(collateral_token), msg.sender, address(this), collateral_amount);
        DEI.pool_mint(msg.sender, dei_amount_d18);
    }

    // 0% collateral-backed
    function mintAlgorithmicDEI(uint256 deus_amount_d18, uint256 DEI_out_min) external notMintPaused {
        uint256 deus_price = DEI.deus_price();
        require(DEI.global_collateral_ratio() == 0, "Collateral ratio must be 0");
        
        (uint256 dei_amount_d18) = DEIPoolLibrary.calcMintAlgorithmicDEI(
            deus_price, // X DEUS / 1 USD
            deus_amount_d18
        );

        dei_amount_d18 = (dei_amount_d18.mul(uint(1e6).sub(minting_fee))).div(1e6);
        require(DEI_out_min <= dei_amount_d18, "Slippage limit reached");

        deus.pool_burn_from(msg.sender, deus_amount_d18);
        DEI.pool_mint(msg.sender, dei_amount_d18);
    }

    // Will fail if fully collateralized or fully algorithmic
    // > 0% and < 100% collateral-backed
    function mintFractionalDEI(uint256 collateral_amount, uint256 deus_amount, uint256 DEI_out_min) external notMintPaused {
        uint256 deus_price = DEI.deus_price();
        uint256 global_collateral_ratio = DEI.global_collateral_ratio();

        require(global_collateral_ratio < COLLATERAL_RATIO_MAX && global_collateral_ratio > 0, "Collateral ratio needs to be between .000001 and .999999");
        require(collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral).add(collateral_amount) <= pool_ceiling, "Pool ceiling reached, no more DEI can be minted with this collateral");

        uint256 collateral_amount_d18 = collateral_amount * (10 ** missing_decimals);
        DEIPoolLibrary.MintFF_Params memory input_params = DEIPoolLibrary.MintFF_Params(
            deus_price,
            getCollateralPrice(),
            deus_amount,
            collateral_amount_d18,
            global_collateral_ratio
        );

        (uint256 mint_amount, uint256 deus_needed) = DEIPoolLibrary.calcMintFractionalDEI(input_params);

        mint_amount = (mint_amount.mul(uint(1e6).sub(minting_fee))).div(1e6);
        require(DEI_out_min <= mint_amount, "Slippage limit reached");
        require(deus_needed <= deus_amount, "Not enough DEUS inputted");

        deus.pool_burn_from(msg.sender, deus_needed);
        TransferHelper.safeTransferFrom(address(collateral_token), msg.sender, address(this), collateral_amount);
        DEI.pool_mint(msg.sender, mint_amount);
    }

    // Redeem collateral. 100% collateral-backed
    function redeem1t1DEI(uint256 DEI_amount, uint256 COLLATERAL_out_min) external notRedeemPaused {
        require(DEI.global_collateral_ratio() == COLLATERAL_RATIO_MAX, "Collateral ratio must be == 1");

        // Need to adjust for decimals of collateral
        uint256 DEI_amount_precision = DEI_amount.div(10 ** missing_decimals);
        (uint256 collateral_needed) = DEIPoolLibrary.calcRedeem1t1DEI(
            getCollateralPrice(),
            DEI_amount_precision
        );

        collateral_needed = (collateral_needed.mul(uint(1e6).sub(redemption_fee))).div(1e6);
        require(collateral_needed <= collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral), "Not enough collateral in pool");
        require(COLLATERAL_out_min <= collateral_needed, "Slippage limit reached");

        redeemCollateralBalances[msg.sender] = redeemCollateralBalances[msg.sender].add(collateral_needed);
        unclaimedPoolCollateral = unclaimedPoolCollateral.add(collateral_needed);
        lastRedeemed[msg.sender] = block.number;
        
        // Move all external functions to the end
        DEI.pool_burn_from(msg.sender, DEI_amount);
    }

    // Will fail if fully collateralized or algorithmic
    // Redeem DEI for collateral and DEUS. > 0% and < 100% collateral-backed
    function redeemFractionalDEI(uint256 DEI_amount, uint256 DEUS_out_min, uint256 COLLATERAL_out_min) external notRedeemPaused {
        uint256 deus_price = DEI.deus_price();
        uint256 global_collateral_ratio = DEI.global_collateral_ratio();

        require(global_collateral_ratio < COLLATERAL_RATIO_MAX && global_collateral_ratio > 0, "Collateral ratio needs to be between .000001 and .999999");
        uint256 col_price_usd = getCollateralPrice();

        uint256 DEI_amount_post_fee = (DEI_amount.mul(uint(1e6).sub(redemption_fee))).div(PRICE_PRECISION);

        uint256 deus_dollar_value_d18 = DEI_amount_post_fee.sub(DEI_amount_post_fee.mul(global_collateral_ratio).div(PRICE_PRECISION));
        uint256 deus_amount = deus_dollar_value_d18.mul(PRICE_PRECISION).div(deus_price);

        // Need to adjust for decimals of collateral
        uint256 DEI_amount_precision = DEI_amount_post_fee.div(10 ** missing_decimals);
        uint256 collateral_dollar_value = DEI_amount_precision.mul(global_collateral_ratio).div(PRICE_PRECISION);
        uint256 collateral_amount = collateral_dollar_value.mul(PRICE_PRECISION).div(col_price_usd);


        require(collateral_amount <= collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral), "Not enough collateral in pool");
        require(COLLATERAL_out_min <= collateral_amount, "Slippage limit reached [collateral]");
        require(DEUS_out_min <= deus_amount, "Slippage limit reached [DEUS]");

        redeemCollateralBalances[msg.sender] = redeemCollateralBalances[msg.sender].add(collateral_amount);
        unclaimedPoolCollateral = unclaimedPoolCollateral.add(collateral_amount);

        redeemDEUSBalances[msg.sender] = redeemDEUSBalances[msg.sender].add(deus_amount);
        unclaimedPoolDEUS = unclaimedPoolDEUS.add(deus_amount);

        lastRedeemed[msg.sender] = block.number;
        
        // Move all external functions to the end
        DEI.pool_burn_from(msg.sender, DEI_amount);
        deus.pool_mint(address(this), deus_amount);
    }

    // Redeem DEI for DEUS. 0% collateral-backed
    function redeemAlgorithmicDEI(uint256 DEI_amount, uint256 DEUS_out_min) external notRedeemPaused {
        uint256 deus_price = DEI.deus_price();
        uint256 global_collateral_ratio = DEI.global_collateral_ratio();

        require(global_collateral_ratio == 0, "Collateral ratio must be 0"); 
        uint256 deus_dollar_value_d18 = DEI_amount;

        deus_dollar_value_d18 = (deus_dollar_value_d18.mul(uint(1e6).sub(redemption_fee))).div(PRICE_PRECISION); //apply fees

        uint256 deus_amount = deus_dollar_value_d18.mul(PRICE_PRECISION).div(deus_price);
        
        redeemDEUSBalances[msg.sender] = redeemDEUSBalances[msg.sender].add(deus_amount);
        unclaimedPoolDEUS = unclaimedPoolDEUS.add(deus_amount);
        
        lastRedeemed[msg.sender] = block.number;
        
        require(DEUS_out_min <= deus_amount, "Slippage limit reached");
        // Move all external functions to the end
        DEI.pool_burn_from(msg.sender, DEI_amount);
        deus.pool_mint(address(this), deus_amount);
    }

    // After a redemption happens, transfer the newly minted DEUS and owed collateral from this pool
    // contract to the user. Redemption is split into two functions to prevent flash loans from being able
    // to take out DEI/collateral from the system, use an AMM to trade the new price, and then mint back into the system.
    function collectRedemption() external {
        require((lastRedeemed[msg.sender].add(redemption_delay)) <= block.number, "Must wait for redemption_delay blocks before collecting redemption");
        bool sendDEUS = false;
        bool sendCollateral = false;
        uint DEUSAmount = 0;
        uint CollateralAmount = 0;

        // Use Checks-Effects-Interactions pattern
        if(redeemDEUSBalances[msg.sender] > 0){
            DEUSAmount = redeemDEUSBalances[msg.sender];
            redeemDEUSBalances[msg.sender] = 0;
            unclaimedPoolDEUS = unclaimedPoolDEUS.sub(DEUSAmount);

            sendDEUS = true;
        }
        
        if(redeemCollateralBalances[msg.sender] > 0){
            CollateralAmount = redeemCollateralBalances[msg.sender];
            redeemCollateralBalances[msg.sender] = 0;
            unclaimedPoolCollateral = unclaimedPoolCollateral.sub(CollateralAmount);

            sendCollateral = true;
        }

        if(sendDEUS){
            TransferHelper.safeTransfer(address(deus), msg.sender, DEUSAmount);
        }
        if(sendCollateral){
            TransferHelper.safeTransfer(address(collateral_token), msg.sender, CollateralAmount);
        }
    }


    // When the protocol is recollateralizing, we need to give a discount of DEUS to hit the new CR target
    // Thus, if the target collateral ratio is higher than the actual value of collateral, minters get DEUS for adding collateral
    // This function simply rewards anyone that sends collateral to a pool with the same amount of DEUS + the bonus rate
    // Anyone can call this function to recollateralize the protocol and take the extra DEUS value from the bonus rate as an arb opportunity
    function recollateralizeDEI(uint256 collateral_amount, uint256 DEUS_out_min) external {
        require(recollateralizePaused == false, "Recollateralize is paused");
        uint256 collateral_amount_d18 = collateral_amount * (10 ** missing_decimals);
        uint256 deus_price = DEI.deus_price();
        uint256 dei_total_supply = DEI.totalSupply();
        uint256 global_collateral_ratio = DEI.global_collateral_ratio();
        uint256 global_collat_value = DEI.globalCollateralValue();

        (uint256 collateral_units, uint256 amount_to_recollat) = DEIPoolLibrary.calcRecollateralizeDEIInner(
            collateral_amount_d18,
            getCollateralPrice(),
            global_collat_value,
            dei_total_supply,
            global_collateral_ratio
        ); 

        uint256 collateral_units_precision = collateral_units.div(10 ** missing_decimals);

        uint256 deus_paid_back = amount_to_recollat.mul(uint(1e6).add(bonus_rate).sub(recollat_fee)).div(deus_price);

        require(DEUS_out_min <= deus_paid_back, "Slippage limit reached");
        TransferHelper.safeTransferFrom(address(collateral_token), msg.sender, address(this), collateral_units_precision);
        deus.pool_mint(msg.sender, deus_paid_back);
        
    }

    // Function can be called by an DEUS holder to have the protocol buy back DEUS with excess collateral value from a desired collateral pool
    // This can also happen if the collateral ratio > 1
    function buyBackDEUS(uint256 DEUS_amount, uint256 COLLATERAL_out_min) external {
        require(buyBackPaused == false, "Buyback is paused");
        uint256 deus_price = DEI.deus_price();
    
        DEIPoolLibrary.BuybackDEUS_Params memory input_params = DEIPoolLibrary.BuybackDEUS_Params(
            availableExcessCollatDV(),
            deus_price,
            getCollateralPrice(),
            DEUS_amount
        );

        (uint256 collateral_equivalent_d18) = (DEIPoolLibrary.calcBuyBackDEUS(input_params)).mul(uint(1e6).sub(buyback_fee)).div(1e6);
        uint256 collateral_precision = collateral_equivalent_d18.div(10 ** missing_decimals);

        require(COLLATERAL_out_min <= collateral_precision, "Slippage limit reached");
        // Give the sender their desired collateral and burn the DEUS
        deus.pool_burn_from(msg.sender, DEUS_amount);
        TransferHelper.safeTransfer(address(collateral_token), msg.sender, collateral_precision);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

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

    function toggleCollateralPrice(uint256 _new_price) external {
        require(hasRole(COLLATERAL_PRICE_PAUSER, msg.sender));
        // If pausing, set paused price; else if unpausing, clear pausedPrice
        if(collateralPricePaused == false){
            pausedPrice = _new_price;
        } else {
            pausedPrice = 0;
        }
        collateralPricePaused = !collateralPricePaused;

        emit CollateralPriceToggled(collateralPricePaused);
    }

    // Combined into one function due to 24KiB contract memory limit
    function setPoolParameters(uint256 new_ceiling, uint256 new_bonus_rate, uint256 new_redemption_delay, uint256 new_mint_fee, uint256 new_redeem_fee, uint256 new_buyback_fee, uint256 new_recollat_fee) external onlyByOwnerOrGovernance {
        pool_ceiling = new_ceiling;
        bonus_rate = new_bonus_rate;
        redemption_delay = new_redemption_delay;
        minting_fee = new_mint_fee;
        redemption_fee = new_redeem_fee;
        buyback_fee = new_buyback_fee;
        recollat_fee = new_recollat_fee;

        emit PoolParametersSet(new_ceiling, new_bonus_rate, new_redemption_delay, new_mint_fee, new_redeem_fee, new_buyback_fee, new_recollat_fee);
    }

    function setTimelock(address new_timelock) external onlyByOwnerOrGovernance {
        timelock_address = new_timelock;

        emit TimelockSet(new_timelock);
    }

    /* ========== EVENTS ========== */

    event PoolParametersSet(uint256 new_ceiling, uint256 new_bonus_rate, uint256 new_redemption_delay, uint256 new_mint_fee, uint256 new_redeem_fee, uint256 new_buyback_fee, uint256 new_recollat_fee);
    event TimelockSet(address new_timelock);
    event MintingToggled(bool toggled);
    event RedeemingToggled(bool toggled);
    event RecollateralizeToggled(bool toggled);
    event BuybackToggled(bool toggled);
    event CollateralPriceToggled(bool toggled);

}