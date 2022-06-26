const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async (deployer, { name, symbol }) => {

    const mintableToken = await deploy({
        deployer: deployer,
        contractName: 'MintableToken',
        constructorArguments: [name, symbol]
    })

    return mintableToken;
}