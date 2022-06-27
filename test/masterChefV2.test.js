const { ethers } = require('hardhat')
const deployMasterChefV2 = require("../scripts/deploy_contracts/deploy_master_chef_v2");
const deployToken = require("../scripts/deploy_contracts/deploy_mintable_token");
const {
    setBalance,
    transfer,
    swapETH,
    getBalanceOf,
    impersonate,
} = require('../scripts/helpers/modify_chain.js')

async function getCurrentTimeStamp() {
    const blockNumBefore = await ethers.provider.getBlockNumber()
    const blockBefore = await ethers.provider.getBlock(blockNumBefore)
    return blockBefore.timestamp
}

describe('MasterChefV2 tests', async () => {
    let deus
    let lpToken
    // let admin = '0xE5227F141575DcE74721f4A9bE2D7D636F923044'
    let masterChefV2
    let rewarder = '0x0000000000000000000000000000000000000000'
    let staking = '0x0000000000000000000000000000000000000000'
    let deployer
    let aprSetter
    let setter
    let admin
    let tokenPerSecond = BigInt(1e18);
    let user1
    let user2
    let amount
    before(async () => {
        const signers = await hre.ethers.getSigners()
        deployer = signers[0]
        aprSetter = signers[1]
        setter = signers[2]
        admin = signers[3]
        user1 = signers[4]
        user2 = signers[5]


        amount = BigInt(1000e18);
        token = await deployToken(deployer.address, { name: "Deus", symbol: "Deus" });
        deus = token.address
        masterChefV2 = await deployMasterChefV2(deployer.address, {
            deus, rewarder, tokenPerSecond, staking, aprSetter: aprSetter.address, setter: setter.address, admin: admin.address
        });
        await token.mint(masterChefV2.address, BigInt(1e32));
        lpToken = await deployToken(deployer.address, { name: "TSaking", symbol: "TS1" });
        await masterChefV2.connect(setter).add(1, lpToken.address);
        await lpToken.mint(user1.address, amount);
        await lpToken.mint(user2.address, amount);
    })
    it('should pass', async () => {
        await masterChefV2.connect(setter).setStaking(user1.address);
        await lpToken.connect(user1).approve(masterChefV2.address, amount);
        await masterChefV2.connect(user1).deposit(0, lpToken.balanceOf(user1.address), user1.address);
        await masterChefV2.connect(setter).setStaking(user2.address);
        await lpToken.connect(user2).approve(masterChefV2.address, amount);
        await masterChefV2.connect(user2).deposit(0, lpToken.balanceOf(user2.address), user2.address);
        let current = await getCurrentTimeStamp();
        console.log('timestamp: ', current);
        await network.provider.send('evm_mine', [current + 24 * 60 * 60]);
        // console.log("user1", await masterChefV2.userInfo(0, user1.address));
        console.log("user1", await masterChefV2.pendingTokens(0, user1.address));
        // console.log("user2", await masterChefV2.userInfo(0, user2.address));
        console.log("user2", await masterChefV2.pendingTokens(0, user2.address));
        current = await getCurrentTimeStamp();
        console.log('timestamp', current);

        await masterChefV2.connect(user1).harvest(0, user1.address);
    })
})
