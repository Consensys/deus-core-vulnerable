const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async ({ admin }) => {
  const deployer = process.env.MAIN_DEPLOYER;

  const mintHelper = await deploy({
    deployer: deployer,
    contractName: 'MintHelper',
    constructorArguments: [ admin ]
  })

  return mintHelper;
}