const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async (deployer, { deus, rewarder, tokenPerSecond, staking, aprSetter, setter, admin }) => {

    const masterChefV2 = await deploy({
        deployer: deployer,
        contractName: 'ReadonlyMasterChefV2',
        constructorArguments: [deus, rewarder, tokenPerSecond, staking, aprSetter, setter, admin]
    })

    return masterChefV2;
}