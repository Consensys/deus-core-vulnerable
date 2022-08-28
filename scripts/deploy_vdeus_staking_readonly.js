const deployMasterChefV2 = require("./deploy_contracts/deploy_master_chef_v2_readonly");
const deployStaking = require("./deploy_contracts/deploy_vdeus_staking");
const deployNftValueCalculator = require("./deploy_contracts/deploy_nft_value_calculator");
const deployToken = require("./deploy_contracts/deploy_mintable_token");
const sleep = require("./helpers/sleep");
const { verifyAll } = require("./helpers/deploy_contract");

async function main() {
  const deployer = process.env.MAIN_DEPLOYER;
  const nftValueCalculatorAddress =
    "0x311bD0BB0ec64b43B8d7a7Ad600510624a4A9095";
  const vdeus = "0x62ad8dE6740314677F06723a7A07797aE5082Dbb";
  const rewarder = "0x0000000000000000000000000000000000000000";
  const tokenPerSecond = BigInt("142694063926940");
  const staking = "0x0000000000000000000000000000000000000000";
  const aprSetter = deployer;
  const user = deployer;
  const masterChefSetter = deployer;
  const masterChefAdmin = deployer;
  const masterChefV2 = await deployMasterChefV2(deployer, {
    vdeus,
    rewarder,
    tokenPerSecond,
    staking,
    aprSetter,
    user: user,
    setter: masterChefSetter,
    admin: masterChefAdmin,
  });
  await sleep(5000);

  return

  const dei = "0xDE12c7959E1a72bbe8a5f7A1dc8f8EeF9Ab011B3";
  const usdc = "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75";
  const nft = "0x980C39133a1a4E83e41D652619adf8aa18B95c8B";
  const masterChef = masterChefV2.address;
  const mintHelper = "0x1B7879F4dB7980E464d6B92FDbf9DaA8F1E55073";
  const setter = deployer;
  const poolManager = deployer;
  const stakingAdmin = deployer;
  const vDeusStaking = await deployStaking(deployer, {
    dei,
    usdc,
    nft,
    nftValueCalculator: nftValueCalculatorAddress,
    masterChef,
    mintHelper,
    setter,
    poolManager,
    admin: stakingAdmin,
  });
  await sleep(5000);

  await masterChefV2.setStaking(vDeusStaking.address);
  await sleep(5000);

  const token = await deployToken(deployer, {
    name: "TStakingReadonly1",
    symbol: "TSR1",
  });
  await sleep(5000);
  await masterChefV2.add(1, token.address);
  await sleep(5000);
  const lockDuration = 12 * 30 * 24 * 60 * 60;
  await vDeusStaking.setPool(0, token.address, lockDuration);
  await sleep(5000);

  await verifyAll();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
