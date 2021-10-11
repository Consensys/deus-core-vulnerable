
const hre = require("hardhat");

async function main() {

	const DEUSToken = "0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44";
	const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
	const ethInDeus_ETH = "2000000000000000000";
	const deusInDeus_ETH = "99750000000000000000";
	const creatorAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // UniswapV2Router02


	// Staking
	const daoAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const foundersAddress = "0xfE351F5Ed699fd5eA80b906F89DfdAd2f885A46C"; // Main Deployer
	const daoShare = "100000000000000000";
	const foundersShare = "10000000000000000";
	const rewardPerBlock = "1000";
	const rewardPerBlockSetter = "0x35749cAAf96369b8927A28D1E5C9b2E8367D8aa9";

	// DEUS
	const deusContract = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken");
	const deus = await deusContract.attach(DEUSToken);


	// ERC20
	const erc20Instance = await hre.ethers.getContractFactory("ERC20");
	const weth = await erc20Instance.attach(wethAddress);


	// Uni
	const routerInstance = await hre.ethers.getContractFactory("UniswapV2Router02");
	const router = await routerInstance.attach(routerAddress);
	const factoryInstance = await hre.ethers.getContractFactory("UniswapV2Factory");
	const factory = await factoryInstance.attach(await router.factory());


	// Creating Pairs
	await weth.approve(routerAddress, ethInDeus_ETH + '000');
	await deus.approve(routerAddress, deusInDeus_ETH + '000');
	await new Promise((resolve) => setTimeout(resolve, 60000));
	// address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline
	await router.addLiquidity(deus.address, weth.address, deusInDeus_ETH, ethInDeus_ETH, deusInDeus_ETH, ethInDeus_ETH, creatorAddress, (Date.now() + 10000));
	await new Promise((resolve) => setTimeout(resolve, 100000));
	const deus_ethAddress =  await factory.getPair(deus.address, weth.address);
	console.log("Deus Eth:", deus_ethAddress)

	// Staking
	const stakingContract = await hre.ethers.getContractFactory("Staking");
	// address _stakedToken, address _rewardToken, uint256 _rewardPerBlock, uint256 _daoShare, uint256 _earlyFoundersShare, address _daoWallet, address _earlyFoundersWallet, address _rewardPerBlockSetter
	const stakingDEUS_ETH = await stakingContract.deploy(deus_ethAddress, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter);

	await stakingDEUS_ETH.deployed();

	console.log("STAKING DEUS-ETH deployed to:", stakingDEUS_ETH.address);

	deus.grantRole(deus.MINTER_ROLE(), stakingDEUS_ETH.address);
	
	await hre.run("verify:verify", {
		address: stakingDEUS_ETH.address,
		constructorArguments: [deus_ethAddress, DEUSToken, rewardPerBlock, daoShare, foundersShare, daoAddress, foundersAddress, rewardPerBlockSetter],
	});

	await console.log("STAKING DEUS-ETH deployed to:", stakingDEUS_ETH.address);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
