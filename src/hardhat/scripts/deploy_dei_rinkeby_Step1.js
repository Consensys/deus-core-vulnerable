
const { Signer } = require("ethers");
const hre = require("hardhat");

//By dei deus deployer
async function main() {

	const creatorAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const trustyAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer

	// DEI
	const deiInstance = await hre.ethers.getContractFactory("DEIStablecoin", await hre.ethers.getSigner("0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"));
	// string memory _name, string memory _symbol, address _creator_address, address _trusty_address
	const dei = await deiInstance.deploy("DEI", "DEI", creatorAddress, trustyAddress);
	await dei.deployed();
	console.log("DEI deployed to:", dei.address);

	await hre.run("verify:verify", {
		address: dei.address,
		constructorArguments: ["DEI", "DEI", creatorAddress, trustyAddress],
	});
	
	console.log("DEI deployed to:", dei.address);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
