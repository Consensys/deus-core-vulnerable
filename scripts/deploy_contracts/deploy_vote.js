const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async ({ veDeusAddress }) => {
    const deployer = process.env.veDEUS_DEPLOYER;

    const deployedVote = await deploy({
        deployer: deployer,
        contractName: 'Vote',
        constructorArguments: [veDeusAddress]
    })
    const voteInstance = await hre.ethers.getContractFactory("Vote");
    return voteInstance.attach(deployedVote.address);
}