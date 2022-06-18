const { ethers } = require('hardhat')
const poolDeployer = require('../scripts/deploy_contracts/deploy_dynamic_redeem')
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

describe('DynamicRedeem tests', async () => {
  let dei = '0x4A4573B03B0800e24dEcD8fE497BFeD98ee344B8'
  let deus = '0xde5ed76e7c05ec5e4572cfc88d1acea165109e44'
  let collateral = '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75'
  let muon = '0xE4F8d9A30936a6F8b17a73dC6fEb51a3BBABD51A'
  let library = '0x219E8c4d2EA039d26647B80c424b1F91B427975F'
  let poolCeiling = ethers.utils.parseEther('10000000000000000')
  let admin = '0xE5227F141575DcE74721f4A9bE2D7D636F923044'
  let appId = '20'
  let minimumRequiredSignatures = 1
  let collateralRedemptionDelay = 30
  let oldDeiPool = '0xa0F395aD5df1Fceb319e162CCf1Ef6645dE8508f'
  let _wrapped_ftm_address = '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83'
  let _usdc_address = '0x04068da6c83afcfa0e13ba15a6696662335d5b75'
  let _uniswap_router = '0xf491e7b69e4244ad4002bc14e878a34207e38c29'

  let pool
  let deployer
  before(async () => {
    const signers = await hre.ethers.getSigners()
    deployer = signers[0]
    await setBalance(deployer.address)
    pool = await poolDeployer({
      deiAddress: dei,
      deusAddress: deus,
      collateralAddress: collateral,
      muonAddress: muon,
      libraryAddress: library,
      adminAddress: deployer.address,
      minimumRequiredSignatures: minimumRequiredSignatures,
      collateralRedemptionDelay: collateralRedemptionDelay,
      poolCeiling: poolCeiling,
      appId: appId,
    })

    await swapETH(deployer, _uniswap_router, BigInt(1e30), [
      _wrapped_ftm_address,
      _usdc_address,
    ])
    console.log(await getBalanceOf(collateral, deployer.address))
    await transfer(
      collateral,
      deployer.address,
      pool.address,
      BigInt(20e6 * 1e6),
    )
    await pool.grantRole(await pool.TRUSTY_ROLE(), deployer.address)
    await pool.addWallet([
      '0xdDf169Bf228e6D6e701180E2e6f290739663a784',
      '0xf3fAD54c3b48eE10D676D568A386A4804A9F6814',
    ])
  })
  it('should pass', async () => {
    const deiContract = await hre.ethers.getContractAt('IDEIStablecoin', dei)
    const deiAmount = BigInt(100e18)
    await deiContract.approve(pool.address, deiAmount)
    await deiContract.addPool(deployer.address)
    await deiContract.pool_mint(deployer.address, BigInt(80e6 * 1e18))
    await deiContract.addPool(pool.address)
    console.log(await pool.getCirculatingSupply())
    console.log(await pool.getCollateralRatio())
    await pool.redeemFractionalDEI(deiAmount)
    const usdcBalanceBeforeRedeem = (
      await getBalanceOf(collateral, deployer.address)
    ).toBigInt()
    const current = await getCurrentTimeStamp()
    await network.provider.send('evm_mine', [current + 35])
    await pool.collectCollateral()
    console.log(
      (await getBalanceOf(collateral, deployer.address)).toBigInt() -
        usdcBalanceBeforeRedeem,
    )
  })
})
