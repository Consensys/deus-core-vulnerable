// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

const { setBalance } = require('../helpers/modify_chain');
const { assert, getRandomAddress, printSuccess, oracleServerSign, printTestCasesResults, addTestCase, ZERO_ADDRESS} = require('./utils');
const deployDei = require('../deploy_contracts/deploy_dei');
const deployDeus = require('../deploy_contracts/deploy_deus');
const deployDeiPoolLibrary = require('../deploy_contracts/deploy_dei_pool_library');
const deployUSDCPool = require('../deploy_contracts/deploy_usdc_pool');
const deployOracle = require('../deploy_contracts/deploy_oracle');

async function main() {
  testCases = [];

  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const mainDeployer = process.env.MAIN_DEPLOYER;
  const dei_deployer = process.env.DEI_DEPLOYER;
  const deus_deployer = process.env.DEUS_DEPLOYER;
  
  await setBalance(dei_deployer);
  await setBalance(deus_deployer);

  const USDCPoolCeiling = String(20e6 * 1e6);
  const USDCInDei_USDC = BigInt(4000e6);


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
  const oracle = await deployOracle();
  printSuccess('oracle deployed successfully');
  
  await oracle.grantRole(oracle.ORACLE_ROLE(), mainDeployer);

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
  const randomAddress = getRandomAddress();
  await dei.addPool(randomAddress);
  addTestCase(testCases, (await dei.dei_pools_array(0)).toLowerCase() == randomAddress.toLowerCase() 
      && await dei.dei_pools(randomAddress), 'addPool');
  
  await dei.removePool(randomAddress);
  addTestCase(testCases, await dei.dei_pools_array(0) == ZERO_ADDRESS && !(await dei.dei_pools(randomAddress)), 
      'removePool')
  
  await dei.setNameAndSymbol('Dei Contract', 'DEI');
  addTestCase(testCases, await dei.name() == 'Dei Contract' && await dei.symbol() == 'DEI', 
      "setNameAndSymbol");

  await dei.setOracle(oracle.address);
  addTestCase(testCases, (await dei.oracle()).toLowerCase() == oracle.address.toLowerCase(), "setOracle");
  
  await dei.setDEIStep(100000);
  addTestCase(testCases, await dei.dei_step() == 100000, "setDEIStep");

  const reserveTrackerAddress = "0xCbcdFF7E0779F25d7a72C243ac8C25410c67Dbd2";
  await dei.setReserveTracker(reserveTrackerAddress);
  addTestCase(testCases, (await dei.reserve_tracker_address()).toLowerCase() == reserveTrackerAddress.toLowerCase(), 
      "setReserveTracker");
  
  await dei.setRefreshCooldown(30);
  addTestCase(testCases, await dei.refresh_cooldown() == 30, "setRefreshCooldown");

  await dei.setDEUSAddress(deus.address);
  addTestCase(testCases, deus.address == await dei.deus_address(), "setDeus");
  
  await dei.toggleCollateralRatio();
  addTestCase(testCases, await dei.collateral_ratio_paused(), "toggleCollateralRatio");
  
  await dei.toggleCollateralRatio();
  addTestCase(testCases, !(await dei.collateral_ratio_paused()), "toggleCollateralRatio");
  
  await dei.activateDIP(false);
  addTestCase(testCases, !await dei.DIP(), "activateDIP");

  await dei.setPriceBands(1040000, 960000);
  addTestCase(testCases, await dei.DEI_top_band() == 1040000 && await dei.DEI_bottom_band() == 960000, 
      "setPriceBands");

  await dei.setUseGrowthRatio(true);
  addTestCase(testCases, await dei.use_growth_ratio(), "setUseGrowthRatio");
  
  await dei.setGrowthRatioBands(1040000, 960000);
  addTestCase(testCases, await dei.GR_top_band() == 1040000 && await dei.GR_bottom_band() == 960000, 
      "setPriceBands");

  await dei.addPool(mainDeployer);
  const balanceOfMainDeployer = await dei.balanceOf(mainDeployer);
  
  await dei.pool_mint(mainDeployer, BigInt(100e18));
  addTestCase(testCases, (await dei.balanceOf(mainDeployer)).gt(balanceOfMainDeployer), "pool_mint");
  
  await dei.approve(mainDeployer, BigInt(100e18));
  await dei.pool_burn_from(mainDeployer, BigInt(100e18)); 
  addTestCase(testCases, balanceOfMainDeployer.eq(await dei.balanceOf(mainDeployer)), "pool_burn_from");

  await dei.removePool(mainDeployer);
  await dei.addPool(USDCPool.address);

  let deiPrice = 1050000;
  const deusPrice = 32000000;
  const expireBlock = BigInt(1e18);
  let signature = await oracleServerSign(deus.address, deusPrice, dei.address, deiPrice, expireBlock, 1);
  await dei.refreshCollateralRatio(deusPrice, deiPrice, expireBlock, [signature]);
  try {
    await dei.refreshCollateralRatio(deusPrice, deiPrice, expireBlock, [signature]);
  } catch (err) {
    addTestCase(testCases, String(err).includes('DEI::Internal cooldown not passed'), 'cooldown')
  }
  await dei.setRefreshCooldown(0);
  await dei.refreshCollateralRatio(deusPrice, deiPrice, expireBlock, [signature]);
  addTestCase(testCases, (await dei.global_collateral_ratio()).eq(BigInt(600000)), "refreshCollateralRatio");

  deiPrice = 950000;
  signature = await oracleServerSign(deus.address, deusPrice, dei.address, deiPrice, expireBlock, 1);
  await dei.refreshCollateralRatio(deusPrice, deiPrice, expireBlock, [signature]);
  addTestCase(testCases, (await dei.global_collateral_ratio()).eq(BigInt(700000)), "refreshCollateralRatio");

  await dei.addPool(mainDeployer);
  await dei.pool_mint(mainDeployer, BigInt(1000e18));
  await dei.removePool(mainDeployer);
  // TODO: growth ratio should be tested
  deiPrice = 1000000;
  signature = await oracleServerSign(deus.address, deusPrice, dei.address, deiPrice, expireBlock, 1);
  let growthRatio = await dei.growth_ratio();
  await dei.refreshCollateralRatio(deusPrice, deiPrice, expireBlock, [signature]);
  addTestCase(testCases, (await dei.global_collateral_ratio()).eq(BigInt(700000)), "refreshCollateralRatio");
  addTestCase(testCases, (await dei.growth_ratio()).lt(growthRatio), "refreshCollateralRatio=>change growth ratio");

  const collateralValue = await dei.globalCollateralValue([0, 0, BigInt(1e6)]);
  addTestCase(testCases, collateralValue.eq(0), "globalCollateralValue");

  printTestCasesResults(testCases);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });