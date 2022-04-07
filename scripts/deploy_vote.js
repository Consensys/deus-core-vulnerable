const deployVote = require('./deploy_contracts/deploy_vote.js');
const { verifyAll } = require('./helpers/deploy_contract.js');

async function main() {
    // * configuration
    const veDeusAddress = "0x8B42c6Cb07c8dD5fE5dB3aC03693867AFd11353d";

    // * deployment
    const vote = await deployVote({
        veDeusAddress: veDeusAddress
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
