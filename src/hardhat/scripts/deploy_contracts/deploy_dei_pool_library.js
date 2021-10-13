const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async () => {
    const deployer = process.env.MAIN_DEPLOYER;

    return deploy({
        deployer: deployer,
        contractName: 'DEIPoolLibrary',
        constructorArguments: []
    })

}