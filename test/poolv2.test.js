const { ethers } = require("hardhat");
const deiDeployer = require("../scripts/deploy_contracts/deploy_dei");
const deusDeployer = require("../scripts/deploy_contracts/deploy_deus");
const collateralDeployer = require("../scripts/deploy_contracts/deploy_collateral");
const libraryDeployer = require("../scripts/deploy_contracts/deploy_dei_pool_library");
const poolDeployer = require("../scripts/deploy_contracts/deploy_pool");

describe("Pool v2 tests", async () => {
  let dei;
  let deus;
  let collateral;
  let library;
  let poolCeiling = ethers.utils.parseEther("10000000000000000");
  let admin = process.env.MAIN_DEPLOYER;

  let pool;

  before(async () => {
    dei = await deiDeployer();
    deus = await deusDeployer();
    collateral = await collateralDeployer();
    library = await libraryDeployer();
    pool = await poolDeployer(
      dei.address,
      deus.address,
      collateral.address,
      poolCeiling,
      library.address,
      admin
    );
  });
  it("should pass", async () => {
    console.log(dei.address);
    console.log(deus.address);
    console.log(collateral.address);
    console.log(library.address);
    console.log(admin);
    // console.log(pool.address);
  });
});
