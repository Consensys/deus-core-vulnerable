const { deploy } = require('../helpers/deploy_contract.js')

module.exports = async ({ pairAddress }) => {
  const deployer = process.env.MAIN_DEPLOYER

  return deploy({
    deployer: deployer,
    contractName: 'contracts/Pool/TwapOracle.sol:Oracle',
    constructorArguments: [pairAddress],
  })
}
