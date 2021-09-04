
const hre = require("hardhat");

async function main() {

	const collateralAddress = "0x9Ea9F4F8DDeb79f2b8d16EBA1Aff0306f8035919"; //DAI decimal: 18
	const creatorAddress = "0x00c0c6558Dc28E749C3402766Cd603cec6400F91"; // DEUS 4
	const trustyAddress = "0x00c0c6558Dc28E749C3402766Cd603cec6400F91"; // DEUS 4
	const DAIPoolCeiling = "10000000000000";
	const minimumRequiredSignature = "1";

	// Oracle
	const oracleServerAddress = "0x64761516386d42f1ebc48BA388bC189902df4a05";

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
	
	// POOl DAI
	const poolDAIContract = await hre.ethers.getContractFactory("Pool_DAI")
	// address _dei_contract_address, address _deus_contract_address, address _collateral_address, address _trusty_address, address _admin_address, uint256 _pool_ceiling, address _library
	const poolDAI = await poolDAIContract.deploy(dei.address, deus.address, collateralAddress, trustyAddress, creatorAddress, DAIPoolCeiling, deiPoolLibrary.address);
	
	await poolDAI.deployed();
	
	console.log("Pool DAI deployed to:", poolDAI.address);

	// Parameters
	await oracle.grantRole(oracle.ORACLE_ROLE(), oracleServerAddress);

	await dei.addPool(poolDAI.address);
	await dei.setOracle(oracle.address);
	await dei.setDEIStep(10000);
	await dei.setPriceTarget(1000000);
	await dei.setRefreshCooldown(30);
	await dei.setDEUSAddress(deus.address);
	await dei.setPriceBand(10000);
	
	await deus.setDEIAddress(dei.address);
	
	// uint256 new_ceiling, uint256 new_bonus_rate, uint256 new_redemption_delay, uint256 new_mint_fee, uint256 new_redeem_fee, uint256 new_buyback_fee, uint256 new_recollat_fee
	await poolDAI.setPoolParameters(DAIPoolCeiling, 0, 1, 1000, 1000, 1000, 1000);
	await poolDAI.toggleCollateralPrice(1000000);

	console.log("Collateral(DAI) address:", collateralAddress);
	console.log("ORACLE deployed to:", oracle.address);
	console.log("DEI deployed to:", dei.address);
	console.log("DEUS deployed to:", deus.address);
	console.log("DEI Pool Library deployed to:", deiPoolLibrary.address);
	console.log("Pool DAI deployed to:", poolDAI.address);
	// console.log("STAKING deployed to:", staking.address);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
