const deployAprSetter = require("./deploy_contracts/deploy_apr_setter.js");
const { verifyAll } = require("./helpers/deploy_contract.js");

async function main() {
  // * configuration
  const masterChef = "0x120FF9821817eA2bbB700e1131e5c856ccC20d1b";
  let admin = process.env.MAIN_DEPLOYER;

  console.log(admin);
  // * deployment
  const aprSetter = await deployAprSetter({
    admin: admin,
    setter: admin,
    masterChef: masterChef,
  });

  console.log("name: ", await aprSetter.name());

  await new Promise((resolve) => setTimeout(resolve, 60000));

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
