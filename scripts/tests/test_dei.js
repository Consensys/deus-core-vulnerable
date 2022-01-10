// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

const { deploy } = require('../helpers/deploy_contract');
const { setBalance } = require('../helpers/modify_chain');
const { assert, getRandomAddress, printSuccess, ZERO_ADDRESS} = require('./utils');
const deployDei = require('../deploy_contracts/deploy_dei');
const deployDeus = require('../deploy_contracts/deploy_deus');
const deployDeiPoolLibrary = require('../deploy_contracts/deploy_dei_pool_library');
const deployUSDCPool = require('../deploy_contracts/deploy_usdc_pool');
const { log } = require('console');

async function main() {

  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const mainDeployer = process.env.MAIN_DEPLOYER;
  const dei_deployer = process.env.DEI_DEPLOYER;
  const deus_deployer = process.env.DEUS_DEPLOYER;
  
  // await setBalance(dei_deployer);
  // await setBalance(deus_deployer);

  const USDCPoolCeiling = String(20e6 * 1e6);
  const USDCInDei_USDC = BigInt(4000e6)


  // ----------------
  // Start Deploying
  // ----------------

  // ERC20
  const erc20Instance = await hre.ethers.getContractFactory("ERC20");
  const usdc = await erc20Instance.attach(usdcAddress);

  assert(BigInt(await usdc.balanceOf(dei_deployer)) >= USDCInDei_USDC,
      "There is not enough USDC in deployer for DEI-USDC");

  const dei = await deployDei();
  printSuccess('dei deployed successfully');
  const deus = await deployDeus();
  printSuccess('deus deployed successfully');
  const deiPoolLibrary = await deployDeiPoolLibrary();
  printSuccess('deiPoolLibrary deployed successfully');
  
  const USDCPool = await deployUSDCPool({
    deiAddress: dei.address,
    deusAddress: deus.address,
    usdcAddress: usdcAddress,
    USDCPoolCeiling: USDCPoolCeiling,
    deiPoolLibraryAddress: deiPoolLibrary.address
  });

  // ---------------------
  // Restricted Functions
  // ---------------------

  await dei.addPool(USDCPool.address);  
  assert(await dei.dei_pools_array(0) == USDCPool.address && await dei.dei_pools(USDCPool.address), "addPool doesn't work properly");
  await dei.removePool(USDCPool.address);
  assert(await dei.dei_pools_array(0) == ZERO_ADDRESS && !(await dei.dei_pools(USDCPool.address)), "removePool doesn't work properly");

  await dei.setNameAndSymbol('Dei Contract', 'DEI');
  assert(await dei.name() == 'Dei Contract' && await dei.symbol() == 'DEI', "setNameAndSymbol doesn't work properly");

  const oracleAddress = getRandomAddress();
  await dei.setOracle(oracleAddress);
  assert(oracleAddress.toLowerCase() == (await dei.oracle()).toLowerCase(), "setOracle doesn't work properly");
  
  await dei.setDEIStep(1000);
  assert(await dei.dei_step() == 1000, "setDEIStep doesn't work properly");

  const reserveTrackerAddress = getRandomAddress();
  await dei.setReserveTracker(reserveTrackerAddress);
  assert((await dei.reserve_tracker_address()).toLowerCase() == reserveTrackerAddress.toLowerCase(), "setReserveTracker doesn't work properly");
  
  await dei.setRefreshCooldown(1800);
  assert(await dei.refresh_cooldown() == 1800, "setRefreshCooldown doesn't work properly");

  await dei.setDEUSAddress(deus.address);
  assert(deus.address == await dei.deus_address(), "setDeus doesn't work properly");
  
  await dei.toggleCollateralRatio();
  assert(await dei.collateral_ratio_paused(), "toggleCollateralRatio doesn't work properly");
  await dei.toggleCollateralRatio();
  assert(!(await dei.collateral_ratio_paused()), "toggleCollateralRatio doesn't work properly");
  
  await dei.activateDIP(true);
  assert(await dei.DIP(), "activateDIP doesn't work properly");

  await dei.setPriceBands(1040000, 960000);
  assert(await dei.DEI_top_band() == 1040000 && await dei.DEI_bottom_band() == 960000, "setPriceBands doesn't work properly");

  await dei.setUseGrowthRatio(false);
  assert(!await dei.use_growth_ratio(), "setUseGrowthRatio doesn't work properly");

  await dei.addPool(mainDeployer);
  const balanceOfMainDeployer = await dei.balanceOf(mainDeployer);
  
  await dei.pool_mint(mainDeployer, BigInt(100e18));
  assert((await dei.balanceOf(mainDeployer)).gt(balanceOfMainDeployer), "pool_mint doesn't work properly");
  
  await dei.approve(mainDeployer, BigInt(100e18));
  await dei.pool_burn_from(mainDeployer, BigInt(100e18)); 
  assert(balanceOfMainDeployer.eq(await dei.balanceOf(mainDeployer)), "pool_burn_from doesn't work properly");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });