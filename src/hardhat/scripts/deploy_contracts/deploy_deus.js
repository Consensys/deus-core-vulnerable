const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async () => {
    const trustyAddress = process.env.MAIN_DEPLOYER;
    const deployer = process.env.DEUS_DEPLOYER;

    const deployedDeus = await deploy({
        deployer: deployer,
        contractName: 'contracts/DEUS/DEUS.sol:DEUSToken',
        constructorArguments: ["DEUS", "DEUS", trustyAddress]
    })
    const deusInstance = await hre.ethers.getContractFactory("contracts/DEUS/DEUS.sol:DEUSToken");
    return deusInstance.attach(deployedDeus.address);
}