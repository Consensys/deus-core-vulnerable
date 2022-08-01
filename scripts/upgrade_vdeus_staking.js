const sleep = require("./helpers/sleep");
const hre = require('hardhat');
const { verifyAll, upgradeProxy } = require("./helpers/deploy_contract");
const { ethers } = require("hardhat");

async function main() {
    
    const second_deployer = process.env.SECOND_DEPLOYER
    const proxyAddress = "0x978b5d59DeE843C99B205A81ca82F66F35B1Ba35";

    await upgradeProxy({
        deployer: second_deployer,
        proxyAddress: proxyAddress,
        contractName: 'NFTStaking'
    })

    await sleep(5000);
    await verifyAll();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })