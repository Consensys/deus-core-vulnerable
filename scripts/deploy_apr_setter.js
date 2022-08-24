const deployAprSetter = require("./deploy_contracts/deploy_apr_setter.js");
const { verifyAll } = require("./helpers/deploy_contract.js");

async function main() {
  // * configuration
  const masterChef = "0xa04d179e0C0b32C52D74e1CaC67B192E9f337bB5";
  let admin = "0xE5227F141575DcE74721f4A9bE2D7D636F923044";
  let setter = "0x69f0033d29DAc8f338FF4520B84Ad4Dd6E44A161";

  // * deployment
  const aprSetter = await deployAprSetter({
    admin: admin,
    setter: setter,
    masterChef: masterChef,
  });

  // console.log("name: ");

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
