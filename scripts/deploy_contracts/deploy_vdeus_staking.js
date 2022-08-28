const { deployProxy } = require("../helpers/deploy_contract.js");

module.exports = async (deployer, { dei, usdc, nft, nftValueCalculator, masterChef, mintHelper, user, setter, poolManager, admin }) => {

    const staking = await deployProxy({
        deployer: deployer,
        contractName: 'NFTStaking',
        constructorArguments: [dei, usdc, nft, nftValueCalculator, masterChef, mintHelper, user, setter, poolManager, admin]
    })

    return staking;
}