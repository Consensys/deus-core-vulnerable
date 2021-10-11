
const hre = require("hardhat");

// By Deployer on polygon
async function main() {

	const deiAddress = '0xDE12c7959E1a72bbe8a5f7A1dc8f8EeF9Ab011B3';
	const deusAddress = '0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44';
	const collateralAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; //T-USDC decimal: 6
	const routerAddress = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'; // UniswapV2Router02

	const creatorAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const trustyAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const USDCPoolCeiling = "20000000000000";
	const minimumRequiredSignature = "1";

	// Pairing
	const deiInDei_Deus = "1500000000000000000000" // 1500
	const deusInDei_Deus = "10000000000000000000" // 10
	const deiInDei_Collat = "1000000000000000000000" // 1000
	const collatInDei_Collat = "1000000000" // 1000

	// Staking
	const daoAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const foundersAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const daoShare = "80000000000000000";
	const foundersShare = "40000000000000000";
	const rewardPerBlock = "1000000000000000";
	const rewardPerBlockSetter = "0x961d81D3bD03158E0039F0bE9069131b622cC3B8";

	// Oracle
	const oracleServerAddress = "0xCaFf370042F1F9617c2a53d1E2c95C6f8ceEfa98";
	

	// DEI
	const deiInstance = await hre.ethers.getContractFactory("DEIStablecoin");
	const dei = await deiInstance.attach(deiAddress);
	console.log("DEI deployed to:", dei.address);


	// DEUS
	const deusInstance = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken")
	const deus = await deusInstance.attach(deusAddress); 
	console.log("DEUS deployed to:", deus.address);
	

	// ERC20
	const erc20Instance = await hre.ethers.getContractFactory("ERC20");
	const collateral = await erc20Instance.attach(collateralAddress);


	// ORACLE
	const oracleInstance = await hre.ethers.getContractFactory("Oracle");
	// address _admin, uint256 _minimumRequiredSignature, address _trusty_address
	const oracle = await oracleInstance.deploy(creatorAddress, minimumRequiredSignature, trustyAddress);
	await oracle.deployed();
	console.log("ORACLE deployed to:", oracle.address);
	

	// DEI POOL Librariy
	const deiPoolLibraryInstance = await hre.ethers.getContractFactory("DEIPoolLibrary")
	// empty
	const deiPoolLibrary = await deiPoolLibraryInstance.deploy();               
	await deiPoolLibrary.deployed();
	console.log("DEI Pool Library deployed to:", deiPoolLibrary.address);
	

	// POOl USDC
	const poolUSDCInstance = await hre.ethers.getContractFactory("Pool_USDC")
	// address _dei_contract_address, address _deus_contract_address, address _collateral_address, address _trusty_address, address _admin_address, uint256 _pool_ceiling, address _library
	const poolUSDC = await poolUSDCInstance.deploy(dei.address, deus.address, collateralAddress, trustyAddress, creatorAddress, USDCPoolCeiling, deiPoolLibrary.address);
	await poolUSDC.deployed();
	console.log("Pool USDC deployed to:", poolUSDC.address);
	

	// ReserveTracker
	const reserveTrackerInstance = await hre.ethers.getContractFactory("ReserveTracker");
	const reserveTracker = await reserveTrackerInstance.deploy(dei.address, deus.address);
	await reserveTracker.deployed();
	console.log("ReserveTracker deployed to:", reserveTracker.address);


	// Uni
	const routerInstance = await hre.ethers.getContractFactory("UniswapV2Router02");
	const router = await routerInstance.attach(routerAddress);
	const factoryInstance = await hre.ethers.getContractFactory("UniswapV2Factory");
	const factory = await factoryInstance.attach(await router.factory());

	// Creating Pairs
	await dei.approve(routerAddress, deiInDei_Deus + '000');
	await deus.approve(routerAddress, deusInDei_Deus + '000');
	await new Promise((resolve) => setTimeout(resolve, 300000));
	await router.addLiquidity(dei.address, deus.address, deiInDei_Deus, deusInDei_Deus, deiInDei_Deus, deusInDei_Deus, creatorAddress, (Date.now() + 10000));
	await new Promise((resolve) => setTimeout(resolve, 300000));
	await collateral.approve(routerAddress, collatInDei_Collat + '000')
	await new Promise((resolve) => setTimeout(resolve, 300000));
	// address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline
	await router.addLiquidity(dei.address, collateralAddress, deiInDei_Collat, collatInDei_Collat, deiInDei_Collat, collatInDei_Collat, creatorAddress, (Date.now() + 10000));
	await new Promise((resolve) => setTimeout(resolve, 360000));

	const dei_deusAddress =  await factory.getPair(dei.address, deus.address);
	const dei_collatAddress =  await factory.getPair(dei.address, collateralAddress);
	console.log("Dei-Deus:", dei_deusAddress);
	console.log("Dei-Collateral:", dei_collatAddress);

	// Staking
	const stakingInstance = await hre.ethers.getContractFactory("Staking");
	// address _stakedToken, address _rewardToken, uint256 _rewardPerBlock, uint256 _daoShare, uint256 _earlyFoundersShare, address _daoWallet, address _earlyFoundersWallet, address _rewardPerBlockSetter
	const stakingDEI_DEUS = await stakingInstance.deploy(dei_deusAddress, deus.address, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter);
	const stakingDEI_USDC = await stakingInstance.deploy(dei_collatAddress, deus.address, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter);
	await stakingDEI_DEUS.deployed();
	console.log("STAKING DEI-DEUS deployed to:", stakingDEI_DEUS.address);
	await stakingDEI_USDC.deployed();
	console.log("STAKING DEI-USDC deployed to:", stakingDEI_USDC.address);

	// Parameters
	await oracle.grantRole(oracle.ORACLE_ROLE(), oracleServerAddress);

	await dei.addPool(poolUSDC.address);
	await dei.setOracle(oracle.address);
	await dei.setDEIStep(1000);
	await dei.setReserveTracker(reserveTracker.address);
	await dei.setRefreshCooldown(1800);
	await dei.setDEUSAddress(deus.address);
	await dei.useGrowthRatio(false);
	await dei.setPriceBands(1040000, 960000);

	await deus.setDEIAddress(dei.address);
	await deus.grantRole(deus.MINTER_ROLE(), stakingDEI_DEUS.address);
	await deus.grantRole(deus.MINTER_ROLE(), stakingDEI_USDC.address);
	await deus.toggleVotes();

	await reserveTracker.addDEUSPair(dei_deusAddress);
	
	// uint256 new_ceiling, uint256 new_bonus_rate, uint256 new_redemption_delay, uint256 new_mint_fee, uint256 new_redeem_fee, uint256 new_buyback_fee, uint256 new_recollat_fee
	await poolUSDC.setPoolParameters(USDCPoolCeiling, 0, 2, 5000, 5000, 5000, 5000);
	await poolUSDC.toggleRecollateralize();
	await poolUSDC.toggleBuyBack();
	console.log("Setting Parameters is done");
	
	await hre.run("verify:verify", {
		address: oracle.address,
		constructorArguments: [creatorAddress, minimumRequiredSignature, trustyAddress],
	});
	
	await hre.run("verify:verify", {
		address: deiPoolLibrary.address,
		constructorArguments: [],
	});
	
	await hre.run("verify:verify", {
		address: poolUSDC.address,
		constructorArguments: [dei.address, deus.address, collateralAddress, trustyAddress, creatorAddress, USDCPoolCeiling, deiPoolLibrary.address],
	});
	
	await hre.run("verify:verify", {
		address: reserveTracker.address,
		constructorArguments: [dei.address, deus.address],
	});

	await hre.run("verify:verify", {
		address: stakingDEI_DEUS.address,
		constructorArguments: [dei_deusAddress, deus.address, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter],
	});

	await hre.run("verify:verify", {
		address: stakingDEI_USDC.address,
		constructorArguments: [dei_collatAddress, deus.address, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter],
	});

	console.log("Collateral(USDC) address:", collateralAddress);
	console.log("ORACLE deployed to:", oracle.address);
	console.log("DEI deployed to:", dei.address);
	console.log("DEUS deployed to:", deus.address);
	console.log("DEI Pool Library deployed to:", deiPoolLibrary.address);
	console.log("Pool deployed to:", poolUSDC.address);
	console.log("ReserveTracker deployed to:", reserveTracker.address);

	console.log("Dei-Deus:", dei_deusAddress);
	console.log("Dei-Collateral:", dei_collatAddress);

	console.log("STAKING DEI-DEUS deployed to:", stakingDEI_DEUS.address);
	console.log("STAKING DEI-USDC deployed to:", stakingDEI_USDC.address);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
