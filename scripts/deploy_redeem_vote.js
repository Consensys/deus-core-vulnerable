const deployVote = require("./deploy_contracts/deploy_redeem_vote.js");
const { verifyAll } = require("./helpers/deploy_contract.js");

async function main() {
  // * configuration
  const vDeusAddress = "0x980C39133a1a4E83e41D652619adf8aa18B95c8B";
  const trancheRedeemAddress = "0x4f57964159ED08B23e30391c531e7438D61Ea151";
  const trancheRedeemV2Address = "0xFD74E924dc96c72Ba52439e28CE780908A630D13";
  // * deployment
  const vote = await deployVote({
    vDeusAddress: vDeusAddress,
    trancheRedeemAddress: trancheRedeemAddress,
    trancheRedeemV2Address: trancheRedeemV2Address,
  });

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
