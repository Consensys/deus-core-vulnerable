const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async (deployer, { deus, rewarder, tokenPerSecond, staking }) => {

    const masterChefV2 = await deploy({
        deployer: deployer,
        contractName: 'MasterChefV2',
        constructorArguments: [deus, rewarder, tokenPerSecond, staking]
    })

    return masterChefV2;
}