const deiDeployer = require("../scripts/deploy_contracts/deploy_dei");

describe("Pool v2 tests", async () => {
  let dei;
  let deus;
  let collateral;
  let poolCeiling;
  let library;
  let admin;

  before(async () => {
    dei = await deiDeployer();
  });
  it("should pass", async () => {});
});
