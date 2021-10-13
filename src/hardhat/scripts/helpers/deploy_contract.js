const hre = require("hardhat");

var deployedContracts = [];

module.exports = {
    deploy: async ({ deployer, contractName, constructorArguments }) => {
        const contractInstance = await hre.ethers.getContractFactory(contractName, await hre.ethers.getSigner(deployer));

        const contract = await contractInstance.deploy(...constructorArguments);
        await contract.deployed();
        console.log(contractName, "deployed to:", contract.address);

        deployedContracts.push({
            address: contract.address,
            constructorArguments: constructorArguments
        })

        return contract
    },
    verifyAll: async () => {
        let verifies = []
        deployedContracts.forEach(async (contract) => {
            verifies.push(hre.run('verify:verify', contract));
        })
        await Promise.all(verifies);
        deployedContracts = [];
    }
}
