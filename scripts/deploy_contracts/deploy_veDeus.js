const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async ({ deusAddress }) => {
    const deployer = process.env.veDEUS_DEPLOYER;

    const deployedVeDeus = await deploy({
        deployer: deployer,
        contractName: 'veDEUS',
        constructorArguments: [deusAddress, "Vote-Escrowed DEUS", "veDEUS", "veDEUS_1.0.0"]
    })
    const veDeusInstance = await hre.ethers.getContractFactory("veDEUS");
    return veDeusInstance.attach(deployedVeDeus.address);
}