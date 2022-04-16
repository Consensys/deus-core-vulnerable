const deployLibrary = require('./deploy_contracts/deploy_dei_pool_library.js')
const deployPool = require('./deploy_contracts/deploy_pool.js')
const { verifyAll } = require('./helpers/deploy_contract.js')

async function main() {
  // * configuration
  const deiAddress = '0xde12c7959e1a72bbe8a5f7a1dc8f8eef9ab011b3'
  const deusAddress = '0xde5ed76e7c05ec5e4572cfc88d1acea165109e44'
  const collateralAddress = '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75'
  const muonAddress = '0xe4f8d9a30936a6f8b17a73dc6feb51a3bbabd51a'
  const adminAddress = '0xE5227F141575DcE74721f4A9bE2D7D636F923044'
  const minimumRequiredSignatures = 1
  const collateralRedemptionDelay = 30
  const deusRedemptionDelay = 8 * 60 * 60
  const poolCeiling = '60000000000000000000000000'
  const appId = '20'

  const library = await deployLibrary({})

  // * deployment
  await deployPool({
    deiAddress: deiAddress,
    deusAddress: deusAddress,
    collateralAddress: collateralAddress,
    muonAddress: muonAddress,
    adminAddress: adminAddress,
    minimumRequiredSignatures: minimumRequiredSignatures,
    collateralRedemptionDelay: collateralRedemptionDelay,
    deusRedemptionDelay: deusRedemptionDelay,
    poolCeiling: poolCeiling,
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
