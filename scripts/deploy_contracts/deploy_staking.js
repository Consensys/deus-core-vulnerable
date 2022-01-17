const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async ({ stakeTokenAddress, rewardTokenAddress, rewardPerBlock, daoShare, foundersShare, rewardPerBlockSetter }) => {
    const deployer = process.env.MAIN_DEPLOYER;
    const daoAddress = process.env.MAIN_DEPLOYER;
    const foundersAddress = process.env.MAIN_DEPLOYER;
    console.log('***************');
    return deploy({
        deployer: deployer,
        contractName: 'Staking',
        constructorArguments: [
            stakeTokenAddress,
            rewardTokenAddress,
            rewardPerBlock,
            daoShare,
            foundersShare,
            daoAddress,
            foundersAddress,
            rewardPerBlockSetter
        ]
    })
}