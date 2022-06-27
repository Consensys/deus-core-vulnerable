const { deployProxy } = require("../helpers/deploy_contract.js");

module.exports = async (deployer, { dei, usdc, nft, nftValueCalculator, masterChef, mintHelper, setter, poolManager, admin }) => {

    const staking = await deployProxy({
        deployer: deployer,
        contractName: 'contracts/NftStaking/Staking.sol:Staking',
        constructorArguments: [dei, usdc, nft, nftValueCalculator, masterChef, mintHelper, setter, poolManager, admin]
    })

    return staking;
}