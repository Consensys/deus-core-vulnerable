// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

// =================================================================================================================
//  _|_|_|    _|_|_|_|  _|    _|    _|_|_|      _|_|_|_|  _|                                                       |
//  _|    _|  _|        _|    _|  _|            _|            _|_|_|      _|_|_|  _|_|_|      _|_|_|    _|_|       |
//  _|    _|  _|_|_|    _|    _|    _|_|        _|_|_|    _|  _|    _|  _|    _|  _|    _|  _|        _|_|_|_|     |
//  _|    _|  _|        _|    _|        _|      _|        _|  _|    _|  _|    _|  _|    _|  _|        _|           |
//  _|_|_|    _|_|_|_|    _|_|    _|_|_|        _|        _|  _|    _|    _|_|_|  _|    _|    _|_|_|    _|_|_|     | 
// =================================================================================================================
// ======================= DEIStablecoin (DEI) ======================
// ====================================================================
// DEUS Finance: https://github.com/DeusFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Vahid: https://github.com/vahid-dev
// SAYaghoubnejad: https://github.com/SAYaghoubnejad

// Reviewer(s) / Contributor(s)
// Sam Sun: https://github.com/samczsun

import "../Common/Context.sol";
import "../ERC20/IERC20.sol";
import "../ERC20/ERC20Custom.sol";
import "../ERC20/ERC20.sol";
import "../Math/SafeMath.sol";
import "../Staking/Owned.sol";
import "../DEUS/DEUS.sol";
import "./Pools/DEIPool.sol";
// import "../Oracle/UniswapPairOracle.sol";
// import "../Oracle/ChainlinkETHUSDPriceConsumer.sol";
import "../Governance/AccessControl.sol";

contract DEIStablecoin is ERC20Custom, AccessControl, Owned {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */
    enum PriceChoice { DEI, DEUS }
    // ChainlinkETHUSDPriceConsumer private eth_usd_pricer;
    uint8 private eth_usd_pricer_decimals;
    // UniswapPairOracle private deiEthOracle;
    // UniswapPairOracle private deusEthOracle;
    string public symbol;
    string public name;
    uint8 public constant decimals = 18;
    address public creator_address;
    address public timelock_address; // Governance timelock address
    address public controller_address; // Controller contract to dynamically adjust system parameters automatically
    address public deus_address;
    address public dei_eth_oracle_address;
    address public deus_eth_oracle_address;
    address public weth_address;
    address public eth_usd_consumer_address;
    uint256 public constant genesis_supply = 2000000e18; // 2M DEI (only for testing, genesis supply will be 5k on Mainnet). This is to help with establishing the Uniswap pools, as they need liquidity

    // The addresses in this array are added by the oracle and these contracts are able to mint DEI
    address[] public dei_pools_array;

    // Mapping is also used for faster verification
    mapping(address => bool) public dei_pools; 

    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    
    uint256 public global_collateral_ratio; // 6 decimals of precision, e.g. 924102 = 0.924102
    uint256 public redemption_fee; // 6 decimals of precision, divide by 1000000 in calculations for fee
    uint256 public minting_fee; // 6 decimals of precision, divide by 1000000 in calculations for fee
    uint256 public dei_step; // Amount to change the collateralization ratio by upon refreshCollateralRatio()
    uint256 public refresh_cooldown; // Seconds to wait before being able to run refreshCollateralRatio() again
    uint256 public price_target; // The price of DEI at which the collateral ratio will respond to; this value is only used for the collateral ratio mechanism and not for minting and redeeming which are hardcoded at $1
    uint256 public price_band; // The bound above and below the price target at which the refreshCollateralRatio() will not change the collateral ratio

    address public DEFAULT_ADMIN_ADDRESS;
    bytes32 public constant COLLATERAL_RATIO_PAUSER = keccak256("COLLATERAL_RATIO_PAUSER");
    bool public collateral_ratio_paused = false;

    /* ========== MODIFIERS ========== */

    modifier onlyCollateralRatioPauser() {
        require(hasRole(COLLATERAL_RATIO_PAUSER, msg.sender));
        _;
    }

    modifier onlyPools() {
       require(dei_pools[msg.sender] == true, "Only dei pools can call this function");
        _;
    } 
    
    modifier onlyByOwnerGovernanceOrController() {
        require(msg.sender == owner || msg.sender == timelock_address || msg.sender == controller_address, "You are not the owner, controller, or the governance timelock");
        _;
    }

    modifier onlyByOwnerGovernanceOrPool() {
        require(
            msg.sender == owner 
            || msg.sender == timelock_address 
            || dei_pools[msg.sender] == true, 
            "You are not the owner, the governance timelock, or a pool");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        string memory _name,
        string memory _symbol,
        address _creator_address,
        address _timelock_address
    ) public Owned(_creator_address){
        require(_timelock_address != address(0), "Zero address detected"); 
        name = _name;
        symbol = _symbol;
        creator_address = _creator_address;
        timelock_address = _timelock_address;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        DEFAULT_ADMIN_ADDRESS = _msgSender();
        _mint(creator_address, genesis_supply);
        grantRole(COLLATERAL_RATIO_PAUSER, creator_address);
        grantRole(COLLATERAL_RATIO_PAUSER, timelock_address);
        dei_step = 2500; // 6 decimals of precision, equal to 0.25%
        global_collateral_ratio = 1000000; // Dei system starts off fully collateralized (6 decimals of precision)
        refresh_cooldown = 3600; // Refresh cooldown period is set to 1 hour (3600 seconds) at genesis
        price_target = 1000000; // Collateral ratio will adjust according to the $1 price target at genesis
        price_band = 5000; // Collateral ratio will not adjust if between $0.995 and $1.005 at genesis
    }

    /* ========== VIEWS ========== */

    // Choice = 'DEI' or 'DEUS' for now
    function oracle_price(PriceChoice choice) internal view returns (uint256) {
        // // Get the ETH / USD price first, and cut it down to 1e6 precision
        // uint256 __eth_usd_price = uint256(eth_usd_pricer.getLatestPrice()).mul(PRICE_PRECISION).div(uint256(10) ** eth_usd_pricer_decimals);
        // uint256 price_vs_eth = 0;

        // if (choice == PriceChoice.DEI) {
        //     price_vs_eth = uint256(deiEthOracle.consult(weth_address, PRICE_PRECISION)); // How much DEI if you put in PRICE_PRECISION WETH
        // }
        // else if (choice == PriceChoice.DEUS) {
        //     price_vs_eth = uint256(deusEthOracle.consult(weth_address, PRICE_PRECISION)); // How much DEUS if you put in PRICE_PRECISION WETH
        // }
        // else revert("INVALID PRICE CHOICE. Needs to be either 0 (DEI) or 1 (DEUS)");

        // // Will be in 1e6 format
        // return __eth_usd_price.mul(PRICE_PRECISION).div(price_vs_eth);
        return 0;
    }

    // Returns X DEI = 1 USD
    function dei_price() public view returns (uint256) {
        return oracle_price(PriceChoice.DEI);
    }

    // Returns X DEUS = 1 USD
    function deus_price()  public view returns (uint256) {
        return oracle_price(PriceChoice.DEUS);
    }

    function eth_usd_price() public view returns (uint256) {
        // return uint256(eth_usd_pricer.getLatestPrice()).mul(PRICE_PRECISION).div(uint256(10) ** eth_usd_pricer_decimals);
        return 0;
    }

    // This is needed to avoid costly repeat calls to different getter functions
    // It is cheaper gas-wise to just dump everything and only use some of the info
    function dei_info() public view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256) {
        return (
            oracle_price(PriceChoice.DEI), // dei_price()
            oracle_price(PriceChoice.DEUS), // deus_price()
            totalSupply(), // totalSupply()
            global_collateral_ratio, // global_collateral_ratio()
            globalCollateralValue(), // globalCollateralValue
            minting_fee, // minting_fee()
            redemption_fee, // redemption_fee()
            // uint256(eth_usd_pricer.getLatestPrice()).mul(PRICE_PRECISION).div(uint256(10) ** eth_usd_pricer_decimals) //eth_usd_price
            0
        );
    }

    // Iterate through all dei pools and calculate all value of collateral in all pools globally 
    function globalCollateralValue() public view returns (uint256) {
        uint256 total_collateral_value_d18 = 0; 

        for (uint i = 0; i < dei_pools_array.length; i++){ 
            // Exclude null addresses
            if (dei_pools_array[i] != address(0)){
                total_collateral_value_d18 = total_collateral_value_d18.add(DEIPool(dei_pools_array[i]).collatDollarBalance());
            }

        }
        return total_collateral_value_d18;
    }

    /* ========== PUBLIC FUNCTIONS ========== */
    
    // There needs to be a time interval that this can be called. Otherwise it can be called multiple times per expansion.
    uint256 public last_call_time; // Last time the refreshCollateralRatio function was called
    function refreshCollateralRatio() public {
        require(collateral_ratio_paused == false, "Collateral Ratio has been paused");
        uint256 dei_price_cur = dei_price();
        require(block.timestamp - last_call_time >= refresh_cooldown, "Must wait for the refresh cooldown since last refresh");

        // Step increments are 0.25% (upon genesis, changable by setDEIStep()) 
        
        if (dei_price_cur > price_target.add(price_band)) { //decrease collateral ratio
            if(global_collateral_ratio <= dei_step){ //if within a step of 0, go to 0
                global_collateral_ratio = 0;
            } else {
                global_collateral_ratio = global_collateral_ratio.sub(dei_step);
            }
        } else if (dei_price_cur < price_target.sub(price_band)) { //increase collateral ratio
            if(global_collateral_ratio.add(dei_step) >= 1000000){
                global_collateral_ratio = 1000000; // cap collateral ratio at 1.000000
            } else {
                global_collateral_ratio = global_collateral_ratio.add(dei_step);
            }
        }

        last_call_time = block.timestamp; // Set the time of the last expansion

        emit CollateralRatioRefreshed(global_collateral_ratio);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Used by pools when user redeems
    function pool_burn_from(address b_address, uint256 b_amount) public onlyPools {
        super._burnFrom(b_address, b_amount);
        emit DEIBurned(b_address, msg.sender, b_amount);
    }

    // This function is what other dei pools will call to mint new DEI 
    function pool_mint(address m_address, uint256 m_amount) public onlyPools {
        super._mint(m_address, m_amount);
        emit DEIMinted(msg.sender, m_address, m_amount);
    }

    // Adds collateral addresses supported, such as tether and busd, must be ERC20 
    function addPool(address pool_address) public onlyByOwnerGovernanceOrController {
        require(pool_address != address(0), "Zero address detected");

        require(dei_pools[pool_address] == false, "Address already exists");
        dei_pools[pool_address] = true; 
        dei_pools_array.push(pool_address);

        emit PoolAdded(pool_address);
    }

    // Remove a pool 
    function removePool(address pool_address) public onlyByOwnerGovernanceOrController {
        require(pool_address != address(0), "Zero address detected");

        require(dei_pools[pool_address] == true, "Address nonexistant");
        
        // Delete from the mapping
        delete dei_pools[pool_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < dei_pools_array.length; i++){ 
            if (dei_pools_array[i] == pool_address) {
                dei_pools_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }

        emit PoolRemoved(pool_address);
    }

    function setRedemptionFee(uint256 red_fee) public onlyByOwnerGovernanceOrController {
        redemption_fee = red_fee;

        emit RedemptionFeeSet(red_fee);
    }

    function setMintingFee(uint256 min_fee) public onlyByOwnerGovernanceOrController {
        minting_fee = min_fee;

        emit MintingFeeSet(min_fee);
    }  

    function setDEIStep(uint256 _new_step) public onlyByOwnerGovernanceOrController {
        dei_step = _new_step;

        emit DEIStepSet(_new_step);
    }  

    function setPriceTarget (uint256 _new_price_target) public onlyByOwnerGovernanceOrController {
        price_target = _new_price_target;

        emit PriceTargetSet(_new_price_target);
    }

    function setRefreshCooldown(uint256 _new_cooldown) public onlyByOwnerGovernanceOrController {
    	refresh_cooldown = _new_cooldown;

        emit RefreshCooldownSet(_new_cooldown);
    }

    function setDEUSAddress(address _deus_address) public onlyByOwnerGovernanceOrController {
        require(_deus_address != address(0), "Zero address detected");

        deus_address = _deus_address;

        emit DEUSAddressSet(_deus_address);
    }

    // function setETHUSDOracle(address _eth_usd_consumer_address) public onlyByOwnerGovernanceOrController {
    //     require(_eth_usd_consumer_address != address(0), "Zero address detected");

    //     eth_usd_consumer_address = _eth_usd_consumer_address;
    //     eth_usd_pricer = ChainlinkETHUSDPriceConsumer(eth_usd_consumer_address);
    //     eth_usd_pricer_decimals = eth_usd_pricer.getDecimals();

    //     emit ETHUSDOracleSet(_eth_usd_consumer_address);
    // }

    function setTimelock(address new_timelock) external onlyByOwnerGovernanceOrController {
        require(new_timelock != address(0), "Zero address detected");

        timelock_address = new_timelock;

        emit TimelockSet(new_timelock);
    }

    function setController(address _controller_address) external onlyByOwnerGovernanceOrController {
        require(_controller_address != address(0), "Zero address detected");

        controller_address = _controller_address;

        emit ControllerSet(_controller_address);
    }

    function setPriceBand(uint256 _price_band) external onlyByOwnerGovernanceOrController {
        price_band = _price_band;

        emit PriceBandSet(_price_band);
    }

    // // Sets the DEI_ETH Uniswap oracle address 
    // function setDEIEthOracle(address _dei_oracle_addr, address _weth_address) public onlyByOwnerGovernanceOrController {
    //     require((_dei_oracle_addr != address(0)) && (_weth_address != address(0)), "Zero address detected");
    //     dei_eth_oracle_address = _dei_oracle_addr;
    //     deiEthOracle = UniswapPairOracle(_dei_oracle_addr); 
    //     weth_address = _weth_address;

    //     emit DEIETHOracleSet(_dei_oracle_addr, _weth_address);
    // }

    // Sets the DEUS_ETH Uniswap oracle address 
    // function setDEUSEthOracle(address _deus_oracle_addr, address _weth_address) public onlyByOwnerGovernanceOrController {
    //     require((_deus_oracle_addr != address(0)) && (_weth_address != address(0)), "Zero address detected");

    //     deus_eth_oracle_address = _deus_oracle_addr;
    //     deusEthOracle = UniswapPairOracle(_deus_oracle_addr);
    //     weth_address = _weth_address;

    //     emit DEUSEthOracleSet(_deus_oracle_addr, _weth_address);
    // }

    function toggleCollateralRatio() public onlyCollateralRatioPauser {
        collateral_ratio_paused = !collateral_ratio_paused;

        emit CollateralRatioToggled(collateral_ratio_paused);
    }

    /* ========== EVENTS ========== */

    // Track DEI burned
    event DEIBurned(address indexed from, address indexed to, uint256 amount);

    // Track DEI minted
    event DEIMinted(address indexed from, address indexed to, uint256 amount);

    event CollateralRatioRefreshed(uint256 global_collateral_ratio);
    event PoolAdded(address pool_address);
    event PoolRemoved(address pool_address);
    event RedemptionFeeSet(uint256 red_fee);
    event MintingFeeSet(uint256 min_fee);
    event DEIStepSet(uint256 new_step);
    event PriceTargetSet(uint256 new_price_target);
    event RefreshCooldownSet(uint256 new_cooldown);
    event DEUSAddressSet(address _deus_address);
    event ETHUSDOracleSet(address eth_usd_consumer_address);
    event TimelockSet(address new_timelock);
    event ControllerSet(address controller_address);
    event PriceBandSet(uint256 price_band);
    // event DEIETHOracleSet(address dei_oracle_addr, address weth_address);
    // event DEUSEthOracleSet(address deus_oracle_addr, address weth_address);
    event CollateralRatioToggled(bool collateral_ratio_paused);
}
