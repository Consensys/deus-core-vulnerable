// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

const { deploy } = require('../helpers/deploy_contract');
const { setBalance } = require('../helpers/modify_chain');
const {printSuccess, addTestCase, printTestCasesResults, sleep} = require('./utils');
const deployDeus = require('../deploy_contracts/deploy_deus');
const deployDei = require('../deploy_contracts/deploy_dei');
const deployStaking = require('../deploy_contracts/deploy_staking');
const deployDeiPoolLibrary = require('../deploy_contracts/deploy_dei_pool_library');
const deployUSDCPool = require('../deploy_contracts/deploy_usdc_pool');
const {deployContracts} = require('../deploy_contracts');


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
  printSuccess('USDCPool deployed successfully');

  constructorArguments = [
    dei.address,
    deus.address,
    1000,
    BigInt(5e16),
    BigInt(1e16),
    mainDeployer,
    mainDeployer,
    mainDeployer
  ]

  // const staking2 = await deployStaking(dei.address, deus.address, 1000, BigInt(5e16), BigInt(1e16), mainDeployer); 
  const staking = await deploy({
      deployer: mainDeployer,
      contractName: 'Staking',
      constructorArguments: [
          dei.address,
          deus.address,
          1000,
          BigInt(5e16),
          BigInt(1e16),
          mainDeployer,
          mainDeployer,
          mainDeployer
      ]
  });
  printSuccess('Staking deployed successfully');

  await deus.grantRole(deus.MINTER_ROLE(), staking.address);
  
  await dei.addPool(mainDeployer);
  await dei.pool_mint(mainDeployer, BigInt(100e18));
  await dei.approve(staking.address, BigInt(10e18));
  await staking.deposit(BigInt(10e18));
  addTestCase(testCases, (await staking.totalStakedToken()).eq(BigInt(10e18) + BigInt(1)), 'deposit');

  await staking.withdraw(0);

  await dei.approve(staking.address, BigInt(5e18));
  await staking.depositFor(mainDeployer, BigInt(5e18));
  addTestCase(testCases, (await staking.totalStakedToken()).eq(BigInt(15e18) + BigInt(1)), 'depositFor');
  
  deus_balance = await deus.balanceOf(mainDeployer);
  console.log(deus_balance);
  await staking.withdraw(0);
  console.log(deus_balance);

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