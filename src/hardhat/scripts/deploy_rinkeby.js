

const hre = require("hardhat");
const deployDei = require('./deploy_contracts/deploy_dei.js');
const deployDeus = require('./deploy_contracts/deploy_deus.js');
const deployOracle = require('./deploy_contracts/deploy_oracle.js');
const deployDeiPoolLibrary = require('./deploy_contracts/deploy_dei_pool_library.js');
const deployUSDCPool = require('./deploy_contracts/deploy_usdc_pool.js');
const deployReserveTracker = require('./deploy_contracts/deploy_reserve_tracker.js');
const deployStaking = require('./deploy_contracts/deploy_staking.js');

const { verifyAll } = require('./helpers/deploy_contract.js');
const skipNonce = require('./helpers/skip_nonce.js');

async function main() {

    // ---------------
    // Configurations
    // ---------------

    const usdcAddress = "0x5B230467d60e33DFA6E8e9aF276dc7a210e76946"; // USDC decimal: 6
    const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // UniswapV2Router02

    const creatorAddress = process.env.MAIN_DEPLOYER;
    const USDCPoolCeiling = "20000000000000";

    // Pairing
    const deiInDei_Deus = BigInt(1500e18)
    const deusInDei_Deus = BigInt(10e18)
    const deiInDei_USDC = BigInt(1000e18)
    const USDCInDei_USDC = BigInt(1000e6)

    // Staking
    const daoShare = BigInt(10e16);
    const foundersShare = BigInt(1e16);
    const rewardPerBlock = "1000";
    const rewardPerBlockSetter = "0x35749cAAf96369b8927A28D1E5C9b2E8367D8aa9";

    // USDC Pool Parameters
    const newBonusRate = 0
    const newRedemptionDelay = 2
    const newMintFee = 5000
    const newRedeemFee = 5000
    const newBuyBackFee = 5000
    const newRecollatFee = 5000

    // Wrapped Native Token
    const wrappedNativeTokenAddress = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
    const NativeTokenInDeus_NativeToken = BigInt(2e18);
    const deusInDeus_NativeToken = BigInt(99.75e18);

    // Oracle
    const oracleServerAddress = "0xCaFf370042F1F9617c2a53d1E2c95C6f8ceEfa98";

    const AdminAddress = '0xE5227F141575DcE74721f4A9bE2D7D636F923044';
    const deployer = process.env.MAIN_DEPLOYER;

    // Role Of Pool
    const MINT_PAUSER = '0xc65532185ed70b2e999433e2e9fac124e083acb13ec183a4e05944da0792337b';
	const REDEEM_PAUSER = '0xa84a5389ad41f9aab0831b01e5384cae76e7a7fd09131c206ff7927c201c3857';
	const BUYBACK_PAUSER = '0x103da79ff3755ff7a17a557d28b73d37cb4de0b3c3cc02fa6c48df0f35071fbf';
	const RECOLLATERALIZE_PAUSER = '0x8118eeb5231a5fe4008a55b62860f6a0db4f6c3ac04f8141927a9b3fedd86d2f';

    // ----------------
    // Start Deploying
    // ----------------

    // ERC20
    const erc20Instance = await hre.ethers.getContractFactory("ERC20");
    const usdc = await erc20Instance.attach(usdcAddress);

    const dei= await deployDei();

    const deus = await deployDeus();

    const oracle = await deployOracle()

    const deiPoolLibrary = await deployDeiPoolLibrary();

    const USDCPool = await deployUSDCPool({
        deiAddress: dei.address,
        deusAddress: deus.address,
        usdcAddress: usdcAddress,
        USDCPoolCeiling: USDCPoolCeiling,
        deiPoolLibraryAddress: deiPoolLibrary.address
    });

    const reserveTracker = await deployReserveTracker({ deiAddress: dei.address, deusAddress: deus.address });

    // Uni
    const routerInstance = await hre.ethers.getContractFactory("UniswapV2Router02");
    const router = await routerInstance.attach(routerAddress);

    const factoryInstance = await hre.ethers.getContractFactory("UniswapV2Factory");
    const factory = await factoryInstance.attach(await router.factory());

    // Creating Pairs
    await dei.approve(routerAddress, deiInDei_Deus * BigInt(1000));
    await deus.approve(routerAddress, deusInDei_Deus * BigInt(1000));
    await new Promise((resolve) => setTimeout(resolve, 30000));

    await router.addLiquidity(dei.address, deus.address, deiInDei_Deus, deusInDei_Deus, deiInDei_Deus, deusInDei_Deus, creatorAddress, (Date.now() + 10000));
    await usdc.approve(routerAddress, USDCInDei_USDC * BigInt(1000))
    await new Promise((resolve) => setTimeout(resolve, 30000));

    await router.addLiquidity(dei.address, usdcAddress, deiInDei_USDC, USDCInDei_USDC, deiInDei_USDC, USDCInDei_USDC, creatorAddress, (Date.now() + 10000));
    await new Promise((resolve) => setTimeout(resolve, 60000));

    const dei_deusAddress = await factory.getPair(dei.address, deus.address);
    console.log("Dei-Deus:", dei_deusAddress);

    const dei_usdcAddress = await factory.getPair(dei.address, usdcAddress);
    console.log("Dei-USDC:", dei_usdcAddress);

    // ---------------------------------- //
    // | Skip 2 nonce in other networks | //
    // ---------------------------------- //
    // in main net we created pair in curve.finance
    await skipNonce(deployer, 2);

    console.log("Deploying DEI-DEUS Staking");
    // Staking
    const stakingDEI_DEUS = await deployStaking({
        stakeTokenAddress: dei_deusAddress,
        rewardTokenAddress: deus.address,
        rewardPerBlock,
        daoShare,
        foundersShare,
        rewardPerBlockSetter
    });

    console.log("Deploying DEI-USDC Staking");
    const stakingDEI_USDC = await deployStaking({
        stakeTokenAddress: dei_usdcAddress,
        rewardTokenAddress: deus.address,
        rewardPerBlock,
        daoShare,
        foundersShare,
        rewardPerBlockSetter
    });

    // Parameters
    await oracle.grantRole(oracle.ORACLE_ROLE(), oracleServerAddress);

    await dei.addPool(USDCPool.address);
    await dei.setOracle(oracle.address);
    await dei.setDEIStep(1000);
    await dei.setReserveTracker(reserveTracker.address);
    await dei.setRefreshCooldown(1800);
    await dei.setDEUSAddress(deus.address);
    await dei.useGrowthRatio(false);
    await dei.setPriceBands(1040000, 960000);

    await deus.setDEIAddress(dei.address);
    await deus.grantRole(deus.MINTER_ROLE(), stakingDEI_DEUS.address);
    await deus.grantRole(deus.MINTER_ROLE(), stakingDEI_USDC.address);
    await deus.toggleVotes();

    await reserveTracker.addDEUSPair(dei_deusAddress);

    await USDCPool.setPoolParameters(USDCPoolCeiling, newBonusRate, newRedemptionDelay, newMintFee, newRedeemFee, newBuyBackFee, newRecollatFee);
    await USDCPool.toggleRecollateralize();
    await USDCPool.toggleBuyBack();

    console.log("Setting Parameters is done");

    // ERC20
    const deiDeus = await erc20Instance.attach(dei_deusAddress);
    const deiUsdc = await erc20Instance.attach(dei_usdcAddress);

    await dei.grantRole(dei.DEFAULT_ADMIN_ROLE(), AdminAddress);
    await deus.grantRole(deus.DEFAULT_ADMIN_ROLE(), AdminAddress);
    await oracle.grantRole(oracle.DEFAULT_ADMIN_ROLE(), AdminAddress);
    await USDCPool.grantRole(USDCPool.DEFAULT_ADMIN_ROLE(), AdminAddress);
    await reserveTracker.grantRole(reserveTracker.DEFAULT_ADMIN_ROLE(), AdminAddress);
    await stakingDEI_DEUS.grantRole(stakingDEI_DEUS.DEFAULT_ADMIN_ROLE(), AdminAddress);
    await stakingDEI_USDC.grantRole(stakingDEI_USDC.DEFAULT_ADMIN_ROLE(), AdminAddress);
    
    await dei.transfer(AdminAddress, await dei.balanceOf(deployer));
    await deus.transfer(AdminAddress, BigInt(await deus.balanceOf(deployer)) - deusInDeus_NativeToken);
    await usdc.transfer(AdminAddress, await usdc.balanceOf(deployer));
    await deiDeus.transfer(AdminAddress, await deiDeus.balanceOf(deployer));
    await deiUsdc.transfer(AdminAddress, await deiUsdc.balanceOf(deployer));

    // ---------------------------------- //
    // | Skip 4 nonce in other networks | //
    // ---------------------------------- //
    await skipNonce(deployer, 4);

    const wrappedNativeContract = await hre.ethers.getContractFactory("WETH");
    const wrappedNativeToken = await wrappedNativeContract.attach(wrappedNativeTokenAddress); // weth
    await wrappedNativeToken.deposit({
        value: NativeTokenInDeus_NativeToken
    });

    // Creating Pairs
    await wrappedNativeToken.approve(routerAddress, NativeTokenInDeus_NativeToken * BigInt(1000));
    await deus.approve(routerAddress, deusInDeus_NativeToken * BigInt(1000));
    await new Promise((resolve) => setTimeout(resolve, 30000));

    await router.addLiquidity(
        deus.address,
        wrappedNativeToken.address,
        deusInDeus_NativeToken,
        NativeTokenInDeus_NativeToken,
        deusInDeus_NativeToken,
        NativeTokenInDeus_NativeToken,
        creatorAddress,
        (Date.now() + 10000)
    );
    await new Promise((resolve) => setTimeout(resolve, 60000));

    const deus_NativeTokenAddress = await factory.getPair(deus.address, wrappedNativeToken.address);
    console.log("Deus NativeToken:", deus_NativeTokenAddress)

    console.log("Deploying DEUS-NativeToken Staking");
    // Staking
    const stakingDEUS_NativeToken = await deployStaking({
        stakeTokenAddress: deus_NativeTokenAddress,
        rewardTokenAddress: deus.address,
        rewardPerBlock,
        daoShare,
        foundersShare,
        rewardPerBlockSetter
    })

    await deus.grantRole(deus.MINTER_ROLE(), stakingDEUS_NativeToken.address);

    await stakingDEUS_NativeToken.grantRole(stakingDEUS_NativeToken.DEFAULT_ADMIN_ROLE(), AdminAddress);

    const deus_NativeToken = await erc20Instance.attach(deus_NativeTokenAddress);
    await deus_NativeToken.transfer(AdminAddress, await deus_NativeToken.balanceOf(deployer));

    // ---------------------------------- //
    // | Skip 2 nonce in other networks | //
    // ---------------------------------- //
    await skipNonce(deployer, 2);

    await reserveTracker.addDEUSPair(deus_NativeTokenAddress);

    console.log("Start to renounce roles...");
    await dei.renounceRole(dei.DEFAULT_ADMIN_ROLE(), deployer)
    await dei.renounceRole(dei.COLLATERAL_RATIO_PAUSER(), deployer)
    await dei.renounceRole(dei.TRUSTY_ROLE(), deployer)

    await deus.renounceRole(deus.DEFAULT_ADMIN_ROLE(), deployer)
    await deus.renounceRole(deus.TRUSTY_ROLE(), deployer)
    
    await oracle.renounceRole(oracle.DEFAULT_ADMIN_ROLE(), deployer)
    await oracle.renounceRole(oracle.TRUSTY_ROLE(), deployer)
    
    await USDCPool.renounceRole(USDCPool.DEFAULT_ADMIN_ROLE(), deployer)
    await USDCPool.renounceRole(MINT_PAUSER, deployer)
    await USDCPool.renounceRole(REDEEM_PAUSER, deployer)
    await USDCPool.renounceRole(RECOLLATERALIZE_PAUSER, deployer)
    await USDCPool.renounceRole(BUYBACK_PAUSER, deployer)
    await USDCPool.renounceRole(USDCPool.TRUSTY_ROLE(), deployer)
    await USDCPool.renounceRole(USDCPool.PARAMETER_SETTER_ROLE(), deployer)
    
    await reserveTracker.renounceRole(reserveTracker.DEFAULT_ADMIN_ROLE(), deployer)
    await reserveTracker.renounceRole(reserveTracker.OWNER_ROLE(), deployer)
    
    await stakingDEI_DEUS.renounceRole(stakingDEI_DEUS.DEFAULT_ADMIN_ROLE(), deployer)
    await stakingDEI_DEUS.renounceRole(stakingDEI_DEUS.REWARD_PER_BLOCK_SETTER(), deployer)
    await stakingDEI_DEUS.renounceRole(stakingDEI_DEUS.TRUSTY_ROLE(), deployer)
    
    await stakingDEI_USDC.renounceRole(stakingDEI_USDC.DEFAULT_ADMIN_ROLE(), deployer)
    await stakingDEI_USDC.renounceRole(stakingDEI_USDC.REWARD_PER_BLOCK_SETTER(), deployer)
    await stakingDEI_USDC.renounceRole(stakingDEI_USDC.TRUSTY_ROLE(), deployer)
    
    await stakingDEUS_NativeToken.renounceRole(stakingDEUS_NativeToken.DEFAULT_ADMIN_ROLE(), deployer)
    await stakingDEUS_NativeToken.renounceRole(stakingDEUS_NativeToken.REWARD_PER_BLOCK_SETTER(), deployer)
    await stakingDEUS_NativeToken.renounceRole(stakingDEUS_NativeToken.TRUSTY_ROLE(), deployer)

    console.log("Start to verify the contracts...");
    verifyAll();
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
