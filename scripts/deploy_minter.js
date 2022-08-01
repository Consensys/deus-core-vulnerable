const deployMinter = require("./deploy_contracts/deploy_minter.js");
const { verifyAll } = require("./helpers/deploy_contract.js");

async function main() {

  let adminAddress = "0xE5227F141575DcE74721f4A9bE2D7D636F923044";

  await deployMinter({admin: adminAddress})

  await new Promise((resolve) => setTimeout(resolve, 20000));

  await verifyAll();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
