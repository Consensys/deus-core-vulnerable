
const hre = require("hardhat");

async function main() {

	const DEI_DEUS = "0x6c3de04c121D6754bbb963F183ab31734e6a0e9b";
	const DEI_DAI = "0x33cf66920F25e0233cd429114CfD06DA3886EEb2";
	const DEUSToken = "0x33767b9bF00D2b6a1f21f47b4Ef8c3F6F1686346";
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
	const stakingDEI_DAI = await stakingContract.deploy(DEI_DAI, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter);

	await stakingDEI_DEUS.deployed();

	console.log("STAKING DEI-DEUS deployed to:", stakingDEI_DEUS.address);
	
	await stakingDEI_DAI.deployed();

	console.log("STAKING DEI-DAI deployed to:", stakingDEI_DAI.address);

	deus.grantRole(deus.STAKING_MINTER_ROLE(), stakingDEI_DEUS.address)
	deus.grantRole(deus.STAKING_MINTER_ROLE(), stakingDEI_DAI.address)

	console.log("STAKING DEI-DEUS deployed to:", stakingDEI_DEUS.address);
	console.log("STAKING DEI-DAI deployed to:", stakingDEI_DAI.address);

}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
