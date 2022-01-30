// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.


const { assert, getRandomAddress, printSuccess, ZERO_ADDRESS, addTestCase, printTestCasesResults} = require('./utils');
const { setBalance } = require('../helpers/modify_chain');
const { verifyAll } = require('../helpers/deploy_contract.js');
const deployVeDeus = require('../deploy_contracts/deploy_veDeus.js');
const deployDeus = require('../deploy_contracts/deploy_deus.js');
const { log } = require('console');
const chalk = require('chalk');
const deploy_dei = require('../deploy_contracts/deploy_dei');
const { descending } = require('d3-array');

async function main() {

	testCases = [];

	const deusDeployer = process.env.DEUS_DEPLOYER;
	const mainDeployer = process.env.veDEUS_DEPLOYER;
	
	setBalance(deusDeployer);
	setBalance(mainDeployer);

	const deus = await deployDeus();
	printSuccess('deus deployed successfully');
	const veDeus = await deployVeDeus({
			deusAddress: deus.address
	});
	printSuccess('veDEUS deployed successfully');
	const dei = await deploy_dei();
  printSuccess('dei deployed successfully');


	await deus.setDEIAddress(dei.address);
	await deus.grantRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", mainDeployer);
	await dei.addPool(mainDeployer);

	const twoWeekLaterEpoch = Math.round(Date.now() / 1000) + 2 * 7 * 24 * 3600;
	await deus.mint(mainDeployer, BigInt(1000e18));
	await deus.approve(veDeus.address, BigInt(100e18));
	let veDeusBalanceInDeus = await deus.balanceOf(veDeus.address);
	await veDeus.create_lock(BigInt(100e18), BigInt(twoWeekLaterEpoch));
	let newVeDeusBalanceInDeus = await deus.balanceOf(veDeus.address);
	addTestCase(testCases, newVeDeusBalanceInDeus.sub(veDeusBalanceInDeus).eq(BigInt(100e18)), 'create_lock');
	console.log(chalk.magentaBright(await deus.balanceOf(veDeus.address)));
	
	
	const randomAddress = getRandomAddress();
	await veDeus.commit_transfer_ownership(randomAddress);
	addTestCase(testCases, (await veDeus.future_admin()).toLowerCase() == randomAddress.toLowerCase(), 'commit_transfer_ownership');

	await veDeus.apply_transfer_ownership();
	addTestCase(testCases, (await veDeus.admin()).toLowerCase() == randomAddress.toLowerCase(), 'apply_transfer_ownership');


	// lock


	// increase amount


	// extend time


	// withdraw

	printTestCasesResults(testCases);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
