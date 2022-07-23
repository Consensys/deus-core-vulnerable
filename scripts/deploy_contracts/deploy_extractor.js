const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async ({ nftStaking }) => {
    const deployer = process.env.MAIN_DEPLOYER;
    const adminAddress = process.env.MAIN_DEPLOYER;
    const extractorAddress = process.env.MAIN_DEPLOYER;

    return deploy({
        deployer: deployer,
        contractName: 'NFTStakingExtractor',
        constructorArguments: [
            nftStaking,
            extractorAddress,
            adminAddress
        ]
    })
}