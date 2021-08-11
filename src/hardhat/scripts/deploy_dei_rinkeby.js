
const hre = require("hardhat");

async function main() {

	const collateralAddress = "0x8313949568A16b2Cc786Af26F363071777Af4b8b"; //HUSD decimal: 6
	const creatorAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const trustyAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const HUSDPoolCeiling = "10000000000000";
	const minimumRequiredSignature = "1";

	// Staking
	const rewardPerBlock = "1000000000000000000";
	const daoShare = "100000000000000000";
	const foundersShasre = "200000000000000000";
	const daoWallet = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E";			// DEUS 2
	const foundersWallet = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E";	// DEUS 2


	// ORACLE
	const oracleContract = await hre.ethers.getContractFactory("Oracle");
	// address _admin, uint256 _minimumRequiredSignature, address _trusty_address
	const oracle = await oracleContract.deploy(creatorAddress, minimumRequiredSignature, trustyAddress);

	await oracle.deployed();

	console.log("ORACLE deployed to:", oracle.address);
	
	// DEI
	const deiContract = await hre.ethers.getContractFactory("DEIStablecoin");
	// string memory _name, string memory _symbol, address _creator_address, address _trusty_address
	const dei = await deiContract.deploy("Dei", "DEI", creatorAddress, trustyAddress);

	await dei.deployed();

	console.log("DEI deployed to:", dei.address);
	// DEUS
	const deusContract = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken")
	// string memory _name, string memory _symbol, address _creator_address, address _trusty_address
	const deus = await deusContract.deploy("Deus", "DEUS", creatorAddress, trustyAddress); 
	
	await deus.deployed();
	
	console.log("DEUS deployed to:", deus.address);
	
	// DEI POOL Librariy
	const deiPoolLibraryContract = await hre.ethers.getContractFactory("DEIPoolLibrary")
	// empty
	const deiPoolLibrary = await deiPoolLibraryContract.deploy();               
	
	await deiPoolLibrary.deployed();
	
	console.log("DEI Pool Library deployed to:", deiPoolLibrary.address);
	
	// POOl HUSD
	const poolHUSDContract = await hre.ethers.getContractFactory("Pool_HUSD")
	// address _dei_contract_address, address _deus_contract_address, address _collateral_address, address _trusty_address, address _admin_address, uint256 _pool_ceiling, address _library
	const poolHUSD = await poolHUSDContract.deploy(dei.address, deus.address, collateralAddress, trustyAddress, creatorAddress, HUSDPoolCeiling, deiPoolLibrary.address);
	
	await poolHUSD.deployed();
	
	console.log("Pool HUSD deployed to:", poolHUSD.address);
	
	// Staking
	const stakingContract = await hre.ethers.getContractFactory("Staking");
	// address _stakedToken, address _rewardToken, uint256 _rewardPerBlock, uint256 _daoShare, uint256 _earlyFoundersShare, address _daoWallet, address _earlyFoundersWallet
	const staking = await stakingContract.deploy(dei.address, deus.address, rewardPerBlock, daoShare, foundersShasre, daoWallet, foundersWallet);

	await staking.deployed();

	console.log("STAKING deployed to:", staking.address);

	// Parameters
	await dei.addPool(poolHUSD.address);
	await dei.setOracle(oracle.address);
	await dei.setDEIStep(10000);
	await dei.setPriceTarget(1000000);
	await dei.setRefreshCooldown(30);
	await dei.setDEUSAddress(deus.address);
	await dei.setPriceBand(5000);
	
	await deus.setDEIAddress(dei.address);
	
	// uint256 new_ceiling, uint256 new_bonus_rate, uint256 new_redemption_delay, uint256 new_mint_fee, uint256 new_redeem_fee, uint256 new_buyback_fee, uint256 new_recollat_fee
	await poolHUSD.setPoolParameters(HUSDPoolCeiling, 0, 1, 1000, 1000, 1000, 1000);
	await poolHUSD.toggleCollateralPrice(1000000);
	
	await hre.run("verify:verify", {
		address: oracle.address,
		constructorArguments: [creatorAddress, minimumRequiredSignature, trustyAddress],
	});
	
	await hre.run("verify:verify", {
		address: dei.address,
		constructorArguments: ["Dei", "DEI", creatorAddress, trustyAddress],
	});
	
	await hre.run("verify:verify", {
		address: deus.address,
		constructorArguments: ["Deus", "DEUS", creatorAddress, trustyAddress],
	});
	
	await hre.run("verify:verify", {
		address: deiPoolLibrary.address,
		constructorArguments: [],
	});
	
	await hre.run("verify:verify", {
		address: poolHUSD.address,
		constructorArguments: [dei.address, deus.address, collateralAddress, trustyAddress, creatorAddress, HUSDPoolCeiling, deiPoolLibrary.address],
	});

	await hre.run("verify:verify", {
		address: staking.address,
		constructorArguments: [dei.address, deus.address, rewardPerBlock, daoShare, foundersShasre, daoWallet, foundersWallet],
	});

	console.log("Collateral(HUSD) address:", collateralAddress);
	console.log("ORACLE deployed to:", oracle.address);
	console.log("DEI deployed to:", dei.address);
	console.log("DEUS deployed to:", deus.address);
	console.log("DEI Pool Library deployed to:", deiPoolLibrary.address);
	console.log("Pool HUSD deployed to:", poolHUSD.address);
	console.log("STAKING deployed to:", staking.address);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
