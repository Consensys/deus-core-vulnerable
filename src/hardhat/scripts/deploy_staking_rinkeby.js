
const hre = require("hardhat");

async function main() {

	const DEI_DEUS = "0x5e2ce79ca56c5EA39530BBFe8fEd68aFc69e6B4D";
	const DEI_HUSD = "0x8f3906394382a7e30961ACDf217b9FBf242c1B96";
	const DEUSToken = "0xEe70f1FE057A886fbB1990a53228C313875faa3E";
	const daoAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const foundersAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const daoShare = "100000000000000000";
	const foundersShare = "200000000000000000";
	const rewardPerBlock = "1000000000000000000";

	const deusContract = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken");

	const deus = await deusContract.attach(DEUSToken);

	// Staking
	const stakingContract = await hre.ethers.getContractFactory("Staking");
	// address _stakedToken, address _rewardToken, uint256 _rewardPerBlock, uint256 _daoShare, uint256 _earlyFoundersShare, address _daoWallet, address _earlyFoundersWallet
	const stakingDEI_DEUS = await stakingContract.deploy(DEI_DEUS, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress);
	const stakingDEI_HUSD = await stakingContract.deploy(DEI_HUSD, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress);

	await stakingDEI_DEUS.deployed();

	console.log("STAKING DEI-DEUS deployed to:", stakingDEI_DEUS.address);
	
	await stakingDEI_HUSD.deployed();

	console.log("STAKING DEI-HUSD deployed to:", stakingDEI_HUSD.address);

	deus.grantRole(deus.STAKING_MINTER_ROLE(), stakingDEI_DEUS.address)
	deus.grantRole(deus.STAKING_MINTER_ROLE(), stakingDEI_HUSD.address)
	
	await hre.run("verify:verify", {
		address: stakingDEI_DEUS.address,
		constructorArguments: [DEI_DEUS, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress],
	});

	await hre.run("verify:verify", {
		address: stakingDEI_HUSD.address,
		constructorArguments: [DEI_HUSD, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress],
	});

	console.log("STAKING DEI-DEUS deployed to:", stakingDEI_DEUS.address);
	console.log("STAKING DEI-HUSD deployed to:", stakingDEI_HUSD.address);

}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
