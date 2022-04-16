const hre = require('hardhat')

var deployedContracts = []

module.exports = {
  deploy: async ({ deployer, contractName, constructorArguments }) => {
    const contractInstance = await hre.ethers.getContractFactory(
      contractName,
      await hre.ethers.getSigner(deployer),
    )

    const contract = await contractInstance.deploy(...constructorArguments)
    await contract.deployed()
    console.log(
      '\x1b[33m' +
        contractName +
        'deployed to: ' +
        contract.address +
        '\x1b[0m',
    )

    deployedContracts.push({
      address: contract.address,
      constructorArguments: constructorArguments,
    })

    return contract
  },
  verifyAll: async () => {
    if (!process.env.LOCAL) {
      console.log(deployedContracts)
      for (let i = 0; i < deployedContracts.length; i++) {
        let contract = deployedContracts[i]
        console.log('Verifying', contract['address'])
        try {
          await hre.run('verify:verify', contract)
        } catch (e) {
          console.log(e)
        }
      }
      deployedContracts = []
    }
  },
}
