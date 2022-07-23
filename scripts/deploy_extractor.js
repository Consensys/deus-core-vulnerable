const deployExtractor = require('./deploy_contracts/deploy_extractor.js');
const { verifyAll } = require('./helpers/deploy_contract.js');

async function main() {
    // * configuration
    const nftStaking = "0x978b5d59DeE843C99B205A81ca82F66F35B1Ba35";

    // * deployment
    const vote = await deployExtractor({
        nftStaking: nftStaking
    });

    await new Promise((resolve) => setTimeout(resolve, 60000));

    await verifyAll();
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
