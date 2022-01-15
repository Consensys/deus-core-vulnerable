const deployVeDeus = require('./deploy_contracts/deploy_veDeus.js');
const { verifyAll } = require('./helpers/deploy_contract.js');

async function main() {
    // * configuration
    const deusAddress = "0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44";

    // * deployment
    const veDeus = await deployVeDeus({
        deusContractAddress: deusAddress
    });

    console.log("version: ", await veDeus.version());

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
