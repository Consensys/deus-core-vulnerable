// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

const { deploy } = require('../helpers/deploy_contract');
const { setBalance } = require('../helpers/modify_chain');
const { assert, getRandomAddress, printSuccess, ZERO_ADDRESS} = require('./utils');
const deployDeus = require('../deploy_contracts/deploy_deus');
const deployDei = require('../deploy_contracts/deploy_dei');
const { log } = require('console');

async function main() {

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
  assert(await deus.name() == 'Deus Contract' && await deus.symbol() == 'Deus', "setNameAndSymbol doesn't work properly");

  await deus.setDEIAddress(dei.address);
  assert(dei.address.toLowerCase() == (await deus.dei_contract_address()).toLowerCase(), "setDEIAddress doesn't work properly");
  
  await deus.grantRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", mainDeployer);

  let balanceOfMainDeployer = await deus.balanceOf(mainDeployer);
  await deus.mint(mainDeployer, BigInt(10e18));
  assert((await deus.balanceOf(mainDeployer)).gt(balanceOfMainDeployer));

  await dei.addPool(mainDeployer);

  balanceOfMainDeployer = await deus.balanceOf(mainDeployer);
  await deus.pool_mint(mainDeployer, BigInt(100e18));
  assert((await deus.balanceOf(mainDeployer)).gt(balanceOfMainDeployer), "pool_mint doesn't work properly");
  
  await deus.approve(mainDeployer, BigInt(100e18));
  await deus.pool_burn_from(mainDeployer, BigInt(100e18)); 
  assert(balanceOfMainDeployer.eq(await deus.balanceOf(mainDeployer)), "pool_burn_from doesn't work properly");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });