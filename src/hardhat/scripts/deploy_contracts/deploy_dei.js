const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async () => {
    const creatorAddress = process.env.MAIN_DEPLOYER;
    const trustyAddress = process.env.MAIN_DEPLOYER;
    const deployer = process.env.DEI_DEPLOYER;

    const deployedDei = await deploy({
        deployer: deployer,
        contractName: 'DEIStablecoin',
        constructorArguments: ["DEI", "DEI", creatorAddress, trustyAddress]
    })
    const deiInstance = await hre.ethers.getContractFactory("DEIStablecoin");
    return deiInstance.attach(deployedDei.address);
}