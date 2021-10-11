
const hre = require("hardhat");

async function main() {

	const DEUSToken = "0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44";
	const maticAddress = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
	const maticInDeus_MATIC = "700000000000000000000";
	const deusInDeus_MATIC = "13000000000000000000";
	const creatorAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const routerAddress = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'; // UniswapV2Router02


	// Staking
	const daoAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const foundersAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const daoShare = "100000000000000000";
	const foundersShare = "10000000000000000";
	const rewardPerBlock = "1000";
	const rewardPerBlockSetter = "0x35749cAAf96369b8927A28D1E5C9b2E8367D8aa9";

	// DEUS
	const deusContract = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken");
	const deus = await deusContract.attach(DEUSToken);


	// ERC20
	const erc20Instance = await hre.ethers.getContractFactory("ERC20");
	const matic = await erc20Instance.attach(maticAddress);


	// Uni
	const routerInstance = await hre.ethers.getContractFactory("UniswapV2Router02");
	const router = await routerInstance.attach(routerAddress);
	const factoryInstance = await hre.ethers.getContractFactory("UniswapV2Factory");
	const factory = await factoryInstance.attach(await router.factory());


	// Creating Pairs
	await matic.approve(routerAddress, maticInDeus_MATIC + '000');
	await deus.approve(routerAddress, deusInDeus_MATIC + '000');
	await new Promise((resolve) => setTimeout(resolve, 60000));
	// address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline
	await router.addLiquidity(deus.address, matic.address, deusInDeus_MATIC, maticInDeus_MATIC, deusInDeus_MATIC, maticInDeus_MATIC, creatorAddress, (Date.now() + 10000));
	await new Promise((resolve) => setTimeout(resolve, 100000));
	const deus_maticAddress =  await factory.getPair(deus.address, matic.address);
	const deus_maticAddress =  '0x6152943b506211ce1FA872702a1b0bc594Cfa2d2';
	console.log("Deus Matic:", deus_maticAddress)

	// Staking
	const stakingContract = await hre.ethers.getContractFactory("Staking");
	// address _stakedToken, address _rewardToken, uint256 _rewardPerBlock, uint256 _daoShare, uint256 _earlyFoundersShare, address _daoWallet, address _earlyFoundersWallet, address _rewardPerBlockSetter
	const stakingDEUS_Matic = await stakingContract.deploy(deus_maticAddress, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter);
	const stakingDEUS_Matic = await stakingContract.attach('0x4C48f1421F62d923d9130834135FB4A58E2F4298');

	// await stakingDEUS_Matic.deployed();

	console.log("STAKING DEUS-MATIC deployed to:", stakingDEUS_Matic.address);

	deus.grantRole(deus.MINTER_ROLE(), stakingDEUS_Matic.address);
	
	await hre.run("verify:verify", {
		address: stakingDEUS_Matic.address,
		constructorArguments: [deus_maticAddress, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter],
	});

	await console.log("STAKING DEUS-MATIC deployed to:", stakingDEUS_Matic.address);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
