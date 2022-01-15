const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async () => {
    const deployer = process.env.veDEUS_DEPLOYER;

    const deusContractAddress = "0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44";

    const deployedVeDeus = await deploy({
        deployer: deployer,
        contractName: 'contracts/veDEUS/veDEUS.vy',
        constructorArguments: [deusContractAddress, "Vote-Escrowed DEUS", "veDEUS", "veDEUS_1.0.0"]
    })
    const veDeusInstance = await hre.ethers.getContractFactory("contracts/veDEUS/veDEUS.vy");
    return veDeusInstance.attach(deployedVeDeus.address);
}