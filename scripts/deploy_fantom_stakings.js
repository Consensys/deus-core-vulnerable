const hre = require("hardhat");
const deployStaking = require('./deploy_contracts/deploy_staking.js');

const { verifyAll } = require('./helpers/deploy_contract.js');
const { sleep } = require("./tests/utils.js");

async function main() {
    
    // ---------------
    // Configurations
    // ---------------

    const rewardPerBlock = 0
    const daoShare = '0'
    const foundersShare = '0'
    const rewardPerBlockSetter = '0xE5227F141575DcE74721f4A9bE2D7D636F923044'
    const AdminAddress = '0xEf6b0872CfDF881Cf9Fe0918D3FA979c616AF983'
    const deployer = process.env.MAIN_DEPLOYER
    // const deusInstance = await hre.ethers.getContractFactory('DEUSToken', await hre.ethers.getSigner(""));
    // const deus = await deusInstance.attach('0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44');

    // const stakingDEI_USDC = await deployStaking({
    //     stakeTokenAddress: '0x8eFD36aA4Afa9F4E157bec759F1744A7FeBaEA0e',
    //     rewardTokenAddress: '0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44',
    //     rewardPerBlock,
    //     daoShare,
    //     foundersShare,
    //     rewardPerBlockSetter
    // });
    const stakingDEI_USDCInstance = await hre.ethers.getContractFactory('Staking');
    const stakingDEI_USDC = await stakingDEI_USDCInstance.attach('0x372b584D4f5Dc77256b18e34692B0881451bf25E');

    // await sleep(10000);
    // const stakingDEUS_NativeToken = await deployStaking({
    //     stakeTokenAddress: '0x2599Eba5fD1e49F294C76D034557948034d6C96E',
    //     rewardTokenAddress: '0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44',
    //     rewardPerBlock,
    //     daoShare,
    //     foundersShare,
    //     rewardPerBlockSetter
    // })
    const stakingDEUS_NativeTokenInstance = await hre.ethers.getContractFactory('Staking');
    const stakingDEUS_NativeToken = await stakingDEUS_NativeTokenInstance.attach('0x3CB9ae281E511759832a074A92634d2486E6a886');

    // await sleep(30000);
    // await deus.grantRole(deus.MINTER_ROLE(), stakingDEI_USDC.address);

    // await sleep(30000);
    // await deus.grantRole(deus.MINTER_ROLE(), stakingDEUS_NativeToken.address);

    // await sleep(10000);
    // await stakingDEI_USDC.grantRole(stakingDEI_USDC.DEFAULT_ADMIN_ROLE(), AdminAddress);

    // await sleep(10000);
    // await stakingDEUS_NativeToken.grantRole(stakingDEUS_NativeToken.DEFAULT_ADMIN_ROLE(), AdminAddress);

    console.log("Start to renounce roles...");

    // await sleep(10000);
    // await stakingDEI_USDC.renounceRole(stakingDEI_USDC.DEFAULT_ADMIN_ROLE(), deployer)

    // await sleep(10000);
    // await stakingDEI_USDC.renounceRole(stakingDEI_USDC.REWARD_PER_BLOCK_SETTER(), deployer)

    // await sleep(10000);
    // await stakingDEI_USDC.renounceRole(stakingDEI_USDC.TRUSTY_ROLE(), deployer)

    // await sleep(10000);
    // await stakingDEUS_NativeToken.renounceRole(stakingDEUS_NativeToken.DEFAULT_ADMIN_ROLE(), deployer)

    // await sleep(10000);
    // await stakingDEUS_NativeToken.renounceRole(stakingDEUS_NativeToken.REWARD_PER_BLOCK_SETTER(), deployer)

    // await sleep(10000);
    // await stakingDEUS_NativeToken.renounceRole(stakingDEUS_NativeToken.TRUSTY_ROLE(), deployer)

    // await verifyAll();
    const contracts = [
        {
            address: '0x372b584D4f5Dc77256b18e34692B0881451bf25E',
            constructorArguments: [
                '0x8eFD36aA4Afa9F4E157bec759F1744A7FeBaEA0e',
                '0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44',
                rewardPerBlock,
                daoShare,
                foundersShare,
                process.env.MAIN_DEPLOYER,
                process.env.MAIN_DEPLOYER,
                rewardPerBlockSetter
            ],
            verified: true
        },
        {
            address: '0x3CB9ae281E511759832a074A92634d2486E6a886',
            constructorArguments: [
                '0x2599Eba5fD1e49F294C76D034557948034d6C96E',
                '0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44',
                rewardPerBlock,
                daoShare,
                foundersShare,
                process.env.MAIN_DEPLOYER,
                process.env.MAIN_DEPLOYER,
                rewardPerBlockSetter
            ],
            verified: true
        },
    ];


    for (const contract of contracts) {
        try {
            await hre.run('verify:verify', contract);
        } catch (err) {
            console.log("error on ", contract['address']);
        }
    }
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
