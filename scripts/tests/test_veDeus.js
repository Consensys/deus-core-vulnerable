// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.


const { assert, getRandomAddress, printSuccess, ZERO_ADDRESS} = require('./utils');
const { verifyAll } = require('./helpers/deploy_contract.js');
const deployVeDeus = require('./deploy_contracts/deploy_veDeus.js');
const deployDeus = require('./deploy_contracts/deploy_deus.js');
const { log } = require('console');

async function main() {

    const deus = await deployDeus();
    printSuccess('deus deployed successfully');
    await deployVeDeus({
        deusContractAddress: deus.address
    });
    printSuccess('veDEUS deployed successfully');

    // lock


    // increase amount


    // extend time


    // withdraw

    
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
