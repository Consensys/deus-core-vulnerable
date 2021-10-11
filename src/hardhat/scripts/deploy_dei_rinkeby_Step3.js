
const hre = require("hardhat");

// By Admin
async function main() {

	const deiAddress = '0xDE12c7959E1a72bbe8a5f7A1dc8f8EeF9Ab011B3';
	const deusAddress = '0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44';
	const oracleAddress = '0x3967e99B02d86ffc84fb69Fd9a7C136952906201';
	const libraryAddress = '0xc63eAf6BC162531b153Dfc61F225E62d2edB4488';
	const poolAddress = '0xa0F395aD5df1Fceb319e162CCf1Ef6645dE8508f';
	const reserveAddress = '0xCbcdFF7E0779F25d7a72C243ac8C25410c67Dbd2';
	const dei_deusStakingAddress = '0x4e5D8794f08F2792DC51016d0a4b9A205cAFc63A';
	const dei_usdcStakingAddress = '0xa78Ea447ce5AA4669A5f0cD8D27bF5883E1Bf20f';
	const collateralAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
	const AdminAddress = '0xE5227F141575DcE74721f4A9bE2D7D636F923044';
	const deployer = '0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C';
	const dei_deusAddress = '0xd6dd359B8C9d18CCB3FE8627060F88D1776d2993';
	const dei_usdcAddress = '0x6870F9b4DD5d34C7FC53D0d85D9dBd1aAB339BF7';

	// DEI
	const deiInstance = await hre.ethers.getContractFactory("DEIStablecoin");
	const dei = await deiInstance.attach(deiAddress);
	console.log("DEI deployed to:", dei.address);


	// ERC20
	const erc20Instance = await hre.ethers.getContractFactory("ERC20");
	const collateral = await erc20Instance.attach(collateralAddress);
	const deiDeus = await erc20Instance.attach(dei_deusAddress);
	const deiUsdc = await erc20Instance.attach(dei_usdcAddress);


	// DEUS
	const deusInstance = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken")
	const deus = await deusInstance.attach(deusAddress); 
	console.log("DEUS deployed to:", deus.address);


	// ORACLE
	const oracleInstance = await hre.ethers.getContractFactory("Oracle");
	const oracle = await oracleInstance.attach(oracleAddress);
	console.log("ORACLE deployed to:", oracle.address);
	

	// DEI POOL Librariy
	const deiPoolLibraryInstance = await hre.ethers.getContractFactory("DEIPoolLibrary")
	const deiPoolLibrary = await deiPoolLibraryInstance.attach(libraryAddress);               
	console.log("DEI Pool Library deployed to:", deiPoolLibrary.address);
	

	// POOl USDC
	const poolUSDCInstance = await hre.ethers.getContractFactory("Pool_USDC")
	const poolUSDC = await poolUSDCInstance.attach(poolAddress);
	console.log("Pool USDC deployed to:", poolUSDC.address);
	

	// ReserveTracker
	const reserveTrackerInstance = await hre.ethers.getContractFactory("ReserveTracker");
	const reserveTracker = await reserveTrackerInstance.attach(reserveAddress);
	console.log("ReserveTracker deployed to:", reserveTracker.address);


	// Staking
	const stakingInstance = await hre.ethers.getContractFactory("Staking");
	// address _stakedToken, address _rewardToken, uint256 _rewardPerBlock, uint256 _daoShare, uint256 _earlyFoundersShare, address _daoWallet, address _earlyFoundersWallet, address _rewardPerBlockSetter
	const stakingDEI_DEUS = await stakingInstance.attach(dei_deusStakingAddress);
	const stakingDEI_USDC = await stakingInstance.attach(dei_usdcStakingAddress);

	await dei.grantRole(dei.DEFAULT_ADMIN_ROLE(), AdminAddress);
	await deus.grantRole(deus.DEFAULT_ADMIN_ROLE(), AdminAddress);
	await oracle.grantRole(oracle.DEFAULT_ADMIN_ROLE(), AdminAddress);
	await new Promise((resolve) => setTimeout(resolve, 30000));
	await poolUSDC.grantRole(poolUSDC.DEFAULT_ADMIN_ROLE(), AdminAddress);
	await reserveTracker.grantRole(reserveTracker.DEFAULT_ADMIN_ROLE(), AdminAddress);
	await stakingDEI_DEUS.grantRole(stakingDEI_DEUS.DEFAULT_ADMIN_ROLE(), AdminAddress);
	await new Promise((resolve) => setTimeout(resolve, 30000));
	await stakingDEI_USDC.grantRole(stakingDEI_USDC.DEFAULT_ADMIN_ROLE(), AdminAddress);
	await dei.transfer(AdminAddress, await dei.balanceOf(deployer));
	await deus.transfer(AdminAddress, await deus.balanceOf(deployer));
	await new Promise((resolve) => setTimeout(resolve, 30000));
	await collateral.transfer(AdminAddress, await collateral.balanceOf(deployer));
	await deiDeus.transfer(AdminAddress, await deiDeus.balanceOf(deployer));
	await deiUsdc.transfer(AdminAddress, await deiUsdc.balanceOf(deployer));
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
