const deployMasterChefV2 = require("./deploy_contracts/deploy_master_chef_v2");
const deployStaking = require("./deploy_contracts/deploy_vdeus_staking");
const deployNftValueCalculator = require("./deploy_contracts/deploy_nft_value_calculator");
const deployToken = require("./deploy_contracts/deploy_mintable_token");
const sleep = require("./helpers/sleep");
const { verifyAll } = require("./helpers/deploy_contract");

async function main() {
    const deployer = process.env.MAIN_DEPLOYER;

    const nftValueCalculator = await deployNftValueCalculator(deployer, {
        trancheRedeemer1: "0x4f57964159ED08B23e30391c531e7438D61Ea151",
        trancheRedeemer2: "0xFD74E924dc96c72Ba52439e28CE780908A630D13",
        v1Edge: 453,
    })
    await sleep(5000);

    const deus = "0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44";
    const rewarder = '0x0000000000000000000000000000000000000000';
    const tokenPerSecond = BigInt(1e18);
    const staking = '0x0000000000000000000000000000000000000000';
    const aprSetter = deployer;
    const masterChefSetter = deployer;
    const masterChefAdmin = deployer;
    const masterChefV2 = await deployMasterChefV2(deployer, { deus, rewarder, tokenPerSecond, staking, aprSetter, setter: masterChefSetter, admin: masterChefAdmin });
    await sleep(5000);

    const dei = "0xDE12c7959E1a72bbe8a5f7A1dc8f8EeF9Ab011B3";
    const usdc = "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75";
    const nft = '0x980C39133a1a4E83e41D652619adf8aa18B95c8B';
    const masterChef = masterChefV2.address;
    const mintHelper = "0x1B7879F4dB7980E464d6B92FDbf9DaA8F1E55073";
    const setter = deployer;
    const poolManager = deployer;
    const stakingAdmin = deployer;
    const vDeusStaking = await deployStaking(deployer, { dei, usdc, nft, nftValueCalculator: nftValueCalculator.address, masterChef, mintHelper, setter, poolManager, admin: stakingAdmin });
    await sleep(5000);

    await masterChefV2.setStaking(vDeusStaking.address);
    await sleep(5000);

    const token1 = await deployToken(deployer, { name: 'TStaking1', symbol: 'TS1' });
    await sleep(5000);
    await masterChefV2.add(1, token1.address);
    await sleep(5000);
    const lockDuration1 = 3 * 30 * 24 * 60 * 60;
    await vDeusStaking.setPool(1, token1.address, lockDuration1);
    await sleep(5000);

    const token2 = await deployToken(deployer, { name: 'TStaking2', symbol: 'TS2' });
    await sleep(5000);
    await masterChefV2.add(2, token2.address);
    await sleep(5000);
    const lockDuration2 = 6 * 30 * 24 * 60 * 60;
    await vDeusStaking.setPool(2, token2.address, lockDuration2);
    await sleep(5000);

    const token3 = await deployToken(deployer, { name: 'TStaking3', symbol: 'TS3' });
    await sleep(5000);
    await masterChefV2.add(3, token3.address);
    await sleep(5000);
    const lockDuration3 = 12 * 30 * 24 * 60 * 60;
    await vDeusStaking.setPool(3, token3.address, lockDuration3);
    await sleep(5000);

    await verifyAll();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })