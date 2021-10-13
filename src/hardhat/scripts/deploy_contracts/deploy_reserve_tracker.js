const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async ({ deiAddress, deusAddress }) => {
    const deployer = process.env.MAIN_DEPLOYER;

    return deploy({
        deployer: deployer,
        contractName: 'ReserveTracker',
        constructorArguments: [
            deiAddress,
            deusAddress,
        ]
    })
}