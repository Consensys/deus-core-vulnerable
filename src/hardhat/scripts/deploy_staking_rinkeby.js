
const hre = require("hardhat");

async function main() {

	const DEI_DEUS = "0xd0B9d3A52fa1dAee082F9ac998b9fB49F6bb7a16";
	const DEI_HUSD = "0xcd9383b17264D32F690E1192B5967514034b168D";
	const DEUSToken = "0x86eD67215aE62a849B5f0c900A7Ed8B9e94945B9";
	const daoAddress = "0x00c0c6558Dc28E749C3402766Cd603cec6400F91"; // DEUS 4
	const foundersAddress = "0x00c0c6558Dc28E749C3402766Cd603cec6400F91"; // DEUS 4
	const daoShare = "100000000000000000";
	const foundersShare = "200000000000000000";
	const rewardPerBlock = "1000000000000000000";
	const rewardPerBlockSetter = "0x00c0c6558Dc28E749C3402766Cd603cec6400F91"; // DEUS 4

	const deusContract = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken");

	const deus = await deusContract.attach(DEUSToken);

	// Staking
	const stakingContract = await hre.ethers.getContractFactory("Staking");
	// address _stakedToken, address _rewardToken, uint256 _rewardPerBlock, uint256 _daoShare, uint256 _earlyFoundersShare, address _daoWallet, address _earlyFoundersWallet, address _rewardPerBlockSetter
	const stakingDEI_DEUS = await stakingContract.deploy(DEI_DEUS, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter);
	const stakingDEI_HUSD = await stakingContract.deploy(DEI_HUSD, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter);

	await stakingDEI_DEUS.deployed();

	console.log("STAKING DEI-DEUS deployed to:", stakingDEI_DEUS.address);
	
	await stakingDEI_HUSD.deployed();

	console.log("STAKING DEI-HUSD deployed to:", stakingDEI_HUSD.address);

	deus.grantRole(deus.STAKING_MINTER_ROLE(), stakingDEI_DEUS.address)
	deus.grantRole(deus.STAKING_MINTER_ROLE(), stakingDEI_HUSD.address)
	
	await hre.run("verify:verify", {
		address: stakingDEI_DEUS.address,
		constructorArguments: [DEI_DEUS, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter],
	});

	await hre.run("verify:verify", {
		address: stakingDEI_HUSD.address,
		constructorArguments: [DEI_HUSD, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter],
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
