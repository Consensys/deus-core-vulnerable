const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async (deployer, { trancheRedeemer1, trancheRedeemer2, v1Edge }) => {

    // address trancheRedeemer1_,
    // address trancheRedeemer2_,
    // uint256 v1Edge_

    const masterChefV2 = await deploy({
        deployer: deployer,
        contractName: 'NftValueCalculator',
        constructorArguments: [trancheRedeemer1, trancheRedeemer2, v1Edge]
    })

    return masterChefV2;
}