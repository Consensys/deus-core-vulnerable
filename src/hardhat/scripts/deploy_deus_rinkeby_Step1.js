
const hre = require("hardhat");

//By dei deus deployer
async function main() {

	const creatorAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const trustyAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer

	// DEUS
	const deusInstance = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken")
	// string memory _name, string memory _symbol, address _creator_address, address _trusty_address
	const deus = await deusInstance.deploy("DEUS", "DEUS", creatorAddress, trustyAddress); 
	await deus.deployed();
	console.log("DEUS deployed to:", deus.address);
	
	await hre.run("verify:verify", {
		address: deus.address,
		constructorArguments: ["DEUS", "DEUS", creatorAddress, trustyAddress],
	});

	console.log("DEUS deployed to:", deus.address);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
