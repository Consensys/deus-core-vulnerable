
const hre = require("hardhat");

async function main() {

	const DEI = "0x7Df10f948083F7eB924dE832c2FB05E2CC363827"; //HUSD decimal: 6
	const creatorAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const trustyAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2

	// DEUS
	const deusContract = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken")
	// string memory _name, string memory _symbol, address _creator_address, address _trusty_address
	const deus = await deusContract.deploy("Deus", "DEUS", creatorAddress, trustyAddress); 
	
	await deus.deployed();
	
	console.log("DEUS deployed to:", deus.address);

	// Staking
	const stakingContract = await hre.ethers.getContractFactory("Staking");
	// address _stakedToken, address _rewardToken, uint256 _rewardPerBlock, uint256 _daoShare, uint256 _earlyFoundersShare, address _daoWallet, address _earlyFoundersWallet
	const staking = await stakingContract.deploy(DEI, deus.address, "1000000000000000000", "100000000000000000", "200000000000000000", creatorAddress, creatorAddress);

	await staking.deployed();

	console.log("STAKING deployed to:", staking.address);

	await deus.setDEIAddress(DEI);
	
	await hre.run("verify:verify", {
		address: deus.address,
		constructorArguments: ["Deus", "DEUS", creatorAddress, trustyAddress],
	});

	await hre.run("verify:verify", {
		address: staking.address,
		constructorArguments: [DEI, deus.address, "1000000000000000000", "100000000000000000", "200000000000000000", creatorAddress, creatorAddress],
	});
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
