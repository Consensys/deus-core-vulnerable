const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async ({ deiAddress, deusAddress, usdcAddress, USDCPoolCeiling, deiPoolLibraryAddress }) => {
    const deployer = process.env.MAIN_DEPLOYER;
    const creatorAddress = process.env.MAIN_DEPLOYER;
    const trustyAddress = process.env.MAIN_DEPLOYER;

    return deploy({
        deployer: deployer,
        contractName: 'Pool_USDC',
        constructorArguments: [
            deiAddress,
            deusAddress,
            usdcAddress,
            trustyAddress,
            creatorAddress,
            USDCPoolCeiling,
            deiPoolLibraryAddress
        ]
    })
}