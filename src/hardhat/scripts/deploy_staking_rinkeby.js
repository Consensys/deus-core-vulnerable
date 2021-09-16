
const hre = require("hardhat");

async function main() {

	const DEI_DEUS = "0x7420ba4Cd2D5583e965DE9A862c0743B26B1Cd53";
	const DEI_USDC = "0xf730a6391F9Bd745F0518AC6116E1cF4B2653fcE";
	const DEUSToken = "0x9Fb1721a9ecb6901b0AA0741a9EcAa1B013AD591";
	const daoAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const foundersAddress = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const daoShare = "100000000000000000";
	const foundersShare = "200000000000000000";
	const rewardPerBlock = "1000000000000000000";
	const rewardPerBlockSetter = "0xB02648091da9e0AAcdd9F5cB9080C4893cad6C4E"; // DEUS 2
	const reserveTrackerAddress = "0x20dc8Bc92BC6e649dFEbBe38a4a4640B1Fe50587";

	const deusContract = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken");

	const deus = await deusContract.attach(DEUSToken);

	const deiContract = await hre.ethers.getContractFactory("DEIStablecoin");

	const dei = await deiContract.attach(DEUSToken);

	// Staking
	const stakingContract = await hre.ethers.getContractFactory("Staking");
	// address _stakedToken, address _rewardToken, uint256 _rewardPerBlock, uint256 _daoShare, uint256 _earlyFoundersShare, address _daoWallet, address _earlyFoundersWallet, address _rewardPerBlockSetter
	const stakingDEI_DEUS = await stakingContract.deploy(DEI_DEUS, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter);
	const stakingDEI_USDC = await stakingContract.deploy(DEI_USDC, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter);

	await stakingDEI_DEUS.deployed();

	console.log("STAKING DEI-DEUS deployed to:", stakingDEI_DEUS.address);
	
	await stakingDEI_USDC.deployed();

	console.log("STAKING DEI-USDC deployed to:", stakingDEI_USDC.address);

	deus.grantRole(deus.STAKING_MINTER_ROLE(), stakingDEI_DEUS.address);
	deus.grantRole(deus.STAKING_MINTER_ROLE(), stakingDEI_USDC.address);
	dei.setReserveTracker(reserveTrackerAddress);
	
	await hre.run("verify:verify", {
		address: stakingDEI_DEUS.address,
		constructorArguments: [DEI_DEUS, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter],
	});

	await hre.run("verify:verify", {
		address: stakingDEI_USDC.address,
		constructorArguments: [DEI_USDC, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter],
	});

	await console.log("STAKING DEI-DEUS deployed to:", stakingDEI_DEUS.address);
	await console.log("STAKING DEI-USDC deployed to:", stakingDEI_USDC.address);

}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
