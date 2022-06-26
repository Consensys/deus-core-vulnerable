const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async (deployer, { nft, nftValueCalculator, masterChef, setter, poolManager, admin }) => {

    const staking = await deploy({
        deployer: deployer,
        contractName: 'contracts/NftStaking/Staking.sol:Staking',
        constructorArguments: [nft, nftValueCalculator, masterChef, setter, poolManager, admin]
    })

    return staking;
}