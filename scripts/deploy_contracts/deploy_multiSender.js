const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async ({ veDeusAddress }) => {
    const deployer = process.env.SECOND_DEPLOYER;

    const deployedMultiSender = await deploy({
        deployer: deployer,
        contractName: 'MultiSender',
        constructorArguments: [veDeusAddress]
    })
    const multiSenderInstance = await hre.ethers.getContractFactory("MultiSender");
    return multiSenderInstance.attach(deployedMultiSender.address);
}