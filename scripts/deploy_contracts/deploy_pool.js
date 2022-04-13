const { deploy } = require("../helpers/deploy_contract.js");

module.exports = async (
  deiAddress,
  deusAddress,
  collateralAddress,
  poolCeiling,
  libraryAddress,
  adminAddress
) => {
  const contractName = "contracts/Pool/PoolV2.sol:DEIPool";
  const deployer = process.env.MAIN_DEPLOYER;
  const deployedPool = await deploy({
    deployer: deployer,
    contractName: contractName,
    constructorArguments: [
      deiAddress,
      deusAddress,
      collateralAddress,
      poolCeiling,
      libraryAddress,
      adminAddress,
    ],
  });
  const poolInstance = await hre.ethers.getContractFactory(contractName);
  return poolInstance.attach(deployedPool.address);
};
