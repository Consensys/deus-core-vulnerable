const deployMasterChefV2 = require("./deploy_contracts/deploy_master_chef_v2");
const deployStaking = require("./deploy_contracts/deploy_vdeus_staking");
const deployNftValueCalculator = require("./deploy_contracts/deploy_nft_value_calculator");
const deployToken = require("./deploy_contracts/deploy_mintable_token");
const sleep = require("./helpers/sleep");
const { verifyAll } = require("./helpers/deploy_contract");

async function main() {
    const deployer = process.env.MAIN_DEPLOYER;

    // const nftValueCalculator = await deployNftValueCalculator(deployer, {
    //     trancheRedeemer1: "0x4f57964159ED08B23e30391c531e7438D61Ea151",
    //     trancheRedeemer2: "0xFD74E924dc96c72Ba52439e28CE780908A630D13",
    //     v1Edge: 453,
    // })

    // await verifyAll();

    // return;

    const token = await deployToken(deployer, { name: 'TDeus', symbol: 'TDS' });
    await sleep(5000);
    const s1 = await deployToken(deployer, { name: 'TStaking', symbol: 'TS1' });

    await sleep(5000);

    const deus = token.address;
    const rewarder = '0x0000000000000000000000000000000000000000';
    const tokenPerSecond = BigInt(1e18);
    const staking = '0x0000000000000000000000000000000000000000';
    const masterChefV2 = await deployMasterChefV2(deployer, { deus, rewarder, tokenPerSecond, staking });

    await sleep(5000);

    await token.mint(masterChefV2.address, BigInt(1e32));

    await sleep(5000);

    await masterChefV2.add(1, s1.address);

    await sleep(5000);

    const masterChef = masterChefV2.address;
    const nft = '0x980C39133a1a4E83e41D652619adf8aa18B95c8B';
    const nftValueCalculator = '0x31E0FC31E7146268529EA4eE1B83E323b13b40D6';
    const setter = deployer;
    const poolManager = deployer;
    const admin = deployer;
    const vDeusStaking = await deployStaking(deployer, { nft, nftValueCalculator, masterChef, setter, poolManager, admin });

    await sleep(5000);

    await vDeusStaking.setPool(0, s1.address, 3 * 60);

    await sleep(5000);

    await masterChefV2.setStaking(vDeusStaking.address);

    await sleep(5000);

    await verifyAll();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })