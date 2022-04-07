const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async ({ deusAddress }) => {
    const deployer = process.env.veDEUS_DEPLOYER;

    const deployedVeDeus = await deploy({
        deployer: deployer,
        contractName: 've',
        constructorArguments: [deusAddress]
    })
    const veDeusInstance = await hre.ethers.getContractFactory("ve");
    return veDeusInstance.attach(deployedVeDeus.address);
}