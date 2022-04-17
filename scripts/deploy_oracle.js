const deployOracle = require('./deploy_contracts/deploy_twap_oracle.js')
const { verifyAll } = require('./helpers/deploy_contract.js')

async function main() {
  // * configuration
  const pairAddress = '0xF42dBcf004a93ae6D5922282B304E2aEFDd50058'

  // * deployment
  await deployOracle({
    pairAddress: pairAddress,
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
