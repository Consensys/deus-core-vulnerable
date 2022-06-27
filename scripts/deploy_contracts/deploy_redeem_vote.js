const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async ({
  vDeusAddress,
  trancheRedeemAddress,
  trancheRedeemV2Address,
}) => {
  const deployer = process.env.veDEUS_DEPLOYER;

  const deployedVote = await deploy({
    deployer: deployer,
    contractName: "RedeemVote",
    constructorArguments: [
      vDeusAddress,
      trancheRedeemAddress,
      trancheRedeemV2Address,
    ],
  });
  const voteInstance = await hre.ethers.getContractFactory("RedeemVote");
  return voteInstance.attach(deployedVote.address);
};
