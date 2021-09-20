
const hre = require("hardhat");

async function main() {

	const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // UniswapV2Router02
	const collateralAddress = "0x6ea88583cd04C4D3fF36d3FB2B25deEf93FC78dD"; //D-USDC decimal: 6
	const creatorAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const trustyAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const USDCPoolCeiling = "10000000000000";
	const minimumRequiredSignature = "1";

	// Pairing
	const deiInDei_Deus = "1000000000000000000000" // 1000
	const deusInDei_Deus = "2000000000000000000000" // 2000
	const deiInDei_Collat = "1000000000000000000000" // 1000
	const collatInDei_Collat = "1000000000" // 1000

	// Staking
	const daoAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const foundersAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const daoShare = "100000000000000000";
	const foundersShare = "200000000000000000";
	const rewardPerBlock = "1000000000000000000";
	const rewardPerBlockSetter = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2

	// Oracle
	const oracleServerAddress = "0x64761516386d42f1ebc48BA388bC189902df4a05";

	
	// ERC20
	const erc20Instance = await hre.ethers.getContractFactory("ERC20");
	const collateral = await erc20Instance.attach(collateralAddress);

	// ORACLE
	const oracleInstance = await hre.ethers.getContractFactory("Oracle");
	// address _admin, uint256 _minimumRequiredSignature, address _trusty_address
	const oracle = await oracleInstance.deploy(creatorAddress, minimumRequiredSignature, trustyAddress);

	await oracle.deployed();

	console.log("ORACLE deployed to:", oracle.address);
	
	// DEI
	const deiInstance = await hre.ethers.getContractFactory("DEIStablecoin");
	// string memory _name, string memory _symbol, address _creator_address, address _trusty_address
	const dei = await deiInstance.deploy("DEI", "DEI", creatorAddress, trustyAddress);

	await dei.deployed();

	console.log("DEI deployed to:", dei.address);

	// DEUS
	const deusInstance = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken")
	// string memory _name, string memory _symbol, address _creator_address, address _trusty_address
	const deus = await deusInstance.deploy("DEUS", "DEUS", creatorAddress, trustyAddress); 
	
	await deus.deployed();
	
	console.log("DEUS deployed to:", deus.address);
	
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
	await dei.approve(routerAddress, deiInDei_Collat + '0');
	await deus.approve(routerAddress, deusInDei_Deus + '0');
	await collateral.approve(routerAddress, collatInDei_Collat + '0')
	await new Promise((resolve) => setTimeout(resolve, 10000));
	// address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline
	await router.addLiquidity(dei.address, collateralAddress, deiInDei_Collat, collatInDei_Collat, deiInDei_Collat, collatInDei_Collat, creatorAddress, (Date.now() + 10000));
	await new Promise((resolve) => setTimeout(resolve, 10000));
	await router.addLiquidity(dei.address, deus.address, deiInDei_Deus, deusInDei_Deus, deiInDei_Deus, deusInDei_Deus, creatorAddress, (Date.now() + 10000));

	await new Promise((resolve) => setTimeout(resolve, 100000));

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
	await dei.setDEIStep(10000);
	// await dei.setPriceTarget(1000000);
	await dei.setReserveTracker(reserveTracker.address);
	await dei.setRefreshCooldown(30);
	await dei.setDEUSAddress(deus.address);
	// await dei.setPriceBand(10000);
	await dei.useGrowthRatio(true);
	await dei.setPriceBands(1100000, 900000);
	
	await deus.setDEIAddress(dei.address);

	await reserveTracker.addDEUSPair(dei_deusAddress);
	
	// uint256 new_ceiling, uint256 new_bonus_rate, uint256 new_redemption_delay, uint256 new_mint_fee, uint256 new_redeem_fee, uint256 new_buyback_fee, uint256 new_recollat_fee
	await poolUSDC.setPoolParameters(USDCPoolCeiling, 0, 1, 1000, 1000, 1000, 1000);
	await poolUSDC.toggleCollateralPrice(1000000);

	await deus.grantRole(deus.STAKING_MINTER_ROLE(), stakingDEI_DEUS.address);
	await deus.grantRole(deus.STAKING_MINTER_ROLE(), stakingDEI_USDC.address);

	console.log("Setting Parameters is done");
	
	await hre.run("verify:verify", {
		address: oracle.address,
		constructorArguments: [creatorAddress, minimumRequiredSignature, trustyAddress],
	});
	
	await hre.run("verify:verify", {
		address: dei.address,
		constructorArguments: ["DEI", "DEI", creatorAddress, trustyAddress],
	});
	
	await hre.run("verify:verify", {
		address: deus.address,
		constructorArguments: ["DEUS", "DEUS", creatorAddress, trustyAddress],
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
