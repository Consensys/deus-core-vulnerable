const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async (signer=undefined) => {
    const trustyAddress = process.env.MAIN_DEPLOYER;
    const deployer = process.env.DEI_DEPLOYER;

    const deployedDei = await deploy({
        deployer: deployer,
        contractName: 'DEIStablecoin',
        constructorArguments: ["DEI", "DEI", trustyAddress]
    })
    const deiInstance = await hre.ethers.getContractFactory("DEIStablecoin", signer);
    return deiInstance.attach(deployedDei.address);
}