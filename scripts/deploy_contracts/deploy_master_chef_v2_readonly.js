const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async (
  deployer,
  { vdeus, rewarder, tokenPerSecond, aprSetter, user, setter, admin }
) => {
  const masterChefV2 = await deploy({
    deployer: deployer,
    contractName: "ReadonlyMasterChefV2",
    constructorArguments: [
      vdeus,
      rewarder,
      tokenPerSecond,
      aprSetter,
      user,
      setter,
      admin,
    ],
  });

  return masterChefV2;
};
