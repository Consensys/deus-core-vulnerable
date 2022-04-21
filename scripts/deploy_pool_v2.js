const deployLibrary = require('./deploy_contracts/deploy_dei_pool_library.js')
const deployPool = require('./deploy_contracts/deploy_pool.js')
const { verifyAll } = require('./helpers/deploy_contract.js')
const { config } = require('./network_config.js')
const hre = require('hardhat')

async function main() {
  // * configuration
  const deiAddress = '0xde12c7959e1a72bbe8a5f7a1dc8f8eef9ab011b3'
  const deusAddress = '0xde5ed76e7c05ec5e4572cfc88d1acea165109e44'
  const minimumRequiredSignatures = 1
  const collateralRedemptionDelay = 30
  const deusRedemptionDelay = 8 * 60 * 60
  const appId = '20'

  const library = await deployLibrary({})

  await new Promise((resolve) => setTimeout(resolve, 10000))
  const conf = config[hre.network.name]
  // * deployment
  await deployPool({
    deiAddress: deiAddress,
    deusAddress: deusAddress,
    collateralAddress: conf.collateralAddress,
    muonAddress: conf.muonAddress,
    adminAddress: conf.adminAddress,
    minimumRequiredSignatures: minimumRequiredSignatures,
    collateralRedemptionDelay: collateralRedemptionDelay,
    deusRedemptionDelay: deusRedemptionDelay,
    poolCeiling: conf.poolCeiling,
    libraryAddress: library.address,
    appId: appId,
  })

  await new Promise((resolve) => setTimeout(resolve, 30000))

  await verifyAll()
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
