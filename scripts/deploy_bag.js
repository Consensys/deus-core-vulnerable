const { deploy, verifyAll } = require("./helpers/deploy_contract.js");
const sleep = require("./helpers/sleep");

async function main() {
  const deployer = process.env.MAIN_DEPLOYER;
  const deus = "0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44";
  const admin = "0xE5227F141575DcE74721f4A9bE2D7D636F923044";
  const refill = "0x2A555D90Dde030d3e40A4DEA6F0BA3DE5a14079e";
  const transferLimit = BigInt(5000e18);

  const bag = await deploy({
    deployer: deployer,
    contractName: "DeusBag",
    constructorArguments: [deus, transferLimit, refill, admin, admin],
  });

  await sleep(5000);

  await verifyAll();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
