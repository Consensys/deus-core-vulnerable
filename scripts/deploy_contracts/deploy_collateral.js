const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async (signer = undefined) => {
  const deployer = process.env.DEI_DEPLOYER;

  const deployedUst = await deploy({
    deployer: deployer,
    contractName: "ERC20",
    constructorArguments: ["UST", "UST"],
  });
  const ustInstance = await hre.ethers.getContractFactory("ERC20", signer);
  return ustInstance.attach(deployedUst.address);
};
