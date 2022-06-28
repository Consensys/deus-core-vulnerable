const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async ({ admin, setter, masterChef }) => {
  const deployer = process.env.MAIN_DEPLOYER;
  console.log(admin, setter, masterChef);
  const deployAprSetter = await deploy({
    deployer: deployer,
    contractName: "AprSetter",
    constructorArguments: [admin, setter, masterChef],
  });
  const aprSetter = await hre.ethers.getContractFactory("AprSetter");
  return aprSetter.attach(deployAprSetter.address);
};
