// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

const { setBalance } = require('../helpers/modify_chain');
const {printSuccess, addTestCase, printTestCasesResults} = require('./utils');
const deployDeus = require('../deploy_contracts/deploy_deus');
const deployDei = require('../deploy_contracts/deploy_dei');

async function main() {
  testCases = [];

  const mainDeployer = process.env.MAIN_DEPLOYER;
  const deus_deployer = process.env.DEUS_DEPLOYER;
  const dei_deployer = process.env.DEI_DEPLOYER;

  await setBalance(dei_deployer);
  await setBalance(deus_deployer);


  const deus = await deployDeus();
  printSuccess('deus deployed successfully');
  const dei = await deployDei();
  printSuccess('dei deployed successfully');
  
  
  // ---------------------
  // Restricted Functions
  // ---------------------

  await deus.setNameAndSymbol('Deus Contract', 'Deus');
  addTestCase(testCases, await deus.name() == 'Deus Contract' && await deus.symbol() == 'Deus', "setNameAndSymbol");

  await deus.setDEIAddress(dei.address);
  addTestCase(testCases, dei.address.toLowerCase() == (await deus.dei_contract_address()).toLowerCase(), "setDEIAddress");
  
  await deus.grantRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", mainDeployer);

  let balanceOfMainDeployer = await deus.balanceOf(mainDeployer);
  await deus.mint(mainDeployer, BigInt(10e18));
  addTestCase(testCases, (await deus.balanceOf(mainDeployer)).gt(balanceOfMainDeployer), "mint");

  await dei.addPool(mainDeployer);

  balanceOfMainDeployer = await deus.balanceOf(mainDeployer);
  await deus.pool_mint(mainDeployer, BigInt(100e18));
  addTestCase(testCases, (await deus.balanceOf(mainDeployer)).gt(balanceOfMainDeployer), "pool_mint");
  
  await deus.approve(mainDeployer, BigInt(100e18));
  await deus.pool_burn_from(mainDeployer, BigInt(100e18)); 
  addTestCase(testCases, balanceOfMainDeployer.eq(await deus.balanceOf(mainDeployer)), "pool_burn_from");

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