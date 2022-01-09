const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async () => {
    const creatorAddress = process.env.MAIN_DEPLOYER;
    const trustyAddress = process.env.MAIN_DEPLOYER;
    const deployer = process.env.MAIN_DEPLOYER;
    const minimumRequiredSignature = "1";

    return deploy({
        deployer: deployer,
        contractName: 'Oracle',
        constructorArguments: [creatorAddress, minimumRequiredSignature, trustyAddress]
    })
}