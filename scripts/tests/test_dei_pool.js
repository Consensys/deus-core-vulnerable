// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

const hre = require("hardhat");
const axios = require('axios');

const deployDei = require('../deploy_contracts/deploy_dei.js');
const deployDeus = require('../deploy_contracts/deploy_deus.js');
const deployOracle = require('../deploy_contracts/deploy_oracle.js');
const deployDeiPoolLibrary = require('../deploy_contracts/deploy_dei_pool_library.js');
const deployUSDCPool = require('../deploy_contracts/deploy_usdc_pool.js');
const deployReserveTracker = require('../deploy_contracts/deploy_reserve_tracker.js');
const deployStaking = require('../deploy_contracts/deploy_staking.js');

const { deploy } = require('../helpers/deploy_contract');
const { setBalance, getBalanceOf } = require('../helpers/modify_chain');
const { assert } = require('../helpers/testing');

const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC decimal: 6
const USDCPoolCeiling = "20000000000000";

async function main() {

    await setBalance(process.env.MAIN_DEPLOYER);
    await setBalance(process.env.DEI_DEPLOYER);
    await setBalance(process.env.DEUS_DEPLOYER);

    const ERC20 = await hre.ethers.getContractFactory("ERC20");
    const usdc = await ERC20.attach(usdcAddress);

    const dei = await deployDei();

    const deus = await deployDeus();

    const deiPoolLibrary = await deployDeiPoolLibrary();

    const USDCPool = await deployUSDCPool({
        deiAddress: dei.address,
        deusAddress: deus.address,
        usdcAddress: usdcAddress,
        USDCPoolCeiling: USDCPoolCeiling,
        deiPoolLibraryAddress: deiPoolLibrary.address
    });

    await dei.addPool(USDCPool.address);
    await dei.setOracle("0x3967e99B02d86ffc84fb69Fd9a7C136952906201");
    await dei.setDEIStep(1000);
    await dei.setRefreshCooldown(1800);
    await dei.setPriceBands(1040000, 960000);
    await dei.setDEUSAddress(deus.address);
    await deus.setDEIAddress(dei.address);

    let collateralPrice = 0;
    let deusPrice = 0;
    let expireBlock = 0;
    let signature = null;
    await axios.get('https://oracle4.deus.finance/dei/mint-fractional?chainId=1').then((result) => {
        let data = result.data
        collateralPrice = data.collateral_price
        deusPrice = data.deus_price
        expireBlock = data.expire_block
        signature = data.signature
    })

    let collateralAmount = BigInt(1e6);
    let deusAmount = (collateralAmount * BigInt(1e18) / BigInt(4 * deusPrice));

    let deusBalance = await getBalanceOf(deus.address, process.env.MAIN_DEPLOYER);
    let usdcBalance = await getBalanceOf(usdcAddress, process.env.MAIN_DEPLOYER);
    let deiBalance = await getBalanceOf(dei.address, process.env.MAIN_DEPLOYER);

    await deus.approve(USDCPool.address, BigInt(1e30))
    await usdc.approve(USDCPool.address, BigInt(1e30))

    let res = await USDCPool.mintFractionalDEI(
        collateralAmount,
        deusAmount,
        collateralPrice,
        deusPrice,
        expireBlock,
        [signature]
    );

    let newDeusBalance = await getBalanceOf(deus.address, process.env.MAIN_DEPLOYER);
    let newUsdcBalance = await getBalanceOf(usdcAddress, process.env.MAIN_DEPLOYER);
    let newDeiBalance = await getBalanceOf(dei.address, process.env.MAIN_DEPLOYER);

    assert(newDeiBalance.sub(deiBalance).eq(BigInt(collateralAmount * BigInt(1e12) * BigInt(5) / BigInt(4))), "mintFractionalDEI does not mint dei");
    assert(usdcBalance.sub(newUsdcBalance).eq(collateralAmount), "mintFractionalDEI does not burn usdc");
    assert(deusBalance.sub(newDeusBalance).eq(deusAmount), "mintFractionalDEI does not burn deus");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
