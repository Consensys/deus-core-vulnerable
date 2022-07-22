const sleep = require("./helpers/sleep");
const { verifyAll, upgradeProxy } = require("./helpers/deploy_contract");

async function main() {
    const deployer = process.env.MAIN_DEPLOYER;

    const proxyAddress = "0x978b5d59DeE843C99B205A81ca82F66F35B1Ba35";

    await upgradeProxy({
        deployer: deployer,
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