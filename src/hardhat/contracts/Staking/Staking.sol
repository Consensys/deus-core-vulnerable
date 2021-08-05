//Be name khoda
// SPDX-License-Identifier: GPL-2.0-or-later

// =================================================================================================================
//  _|_|_|    _|_|_|_|  _|    _|    _|_|_|      _|_|_|_|  _|                                                       |
//  _|    _|  _|        _|    _|  _|            _|            _|_|_|      _|_|_|  _|_|_|      _|_|_|    _|_|       |
//  _|    _|  _|_|_|    _|    _|    _|_|        _|_|_|    _|  _|    _|  _|    _|  _|    _|  _|        _|_|_|_|     |
//  _|    _|  _|        _|    _|        _|      _|        _|  _|    _|  _|    _|  _|    _|  _|        _|           |
//  _|_|_|    _|_|_|_|    _|_|    _|_|_|        _|        _|  _|    _|    _|_|_|  _|    _|    _|_|_|    _|_|_|     |
// =================================================================================================================
// ======================= STAKING ======================
// ======================================================
// DEUS Finance: https://github.com/DeusFinance

// Primary Author(s)
// Vahid: https://github.com/vahid-dev
// Hosein: https://github.com/hedzed

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
	function balanceOf(address account) external view returns (uint256);
	function transfer(address recipient, uint256 amount) external returns (bool);
	function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract Staking is Ownable {

	struct User {
		uint256 depositAmount;
		uint256 paidReward;
	}

	mapping (address => User) public users;

	uint256 public rewardTillNowPerToken = 0;
	uint256 public lastUpdatedBlock;
	uint256 public rewardPerBlock;
	uint256 public scale = 1e18;

	uint256 public particleCollector = 0;
	uint256 public daoShare;
	uint256 public earlyFoundersShare;
	address public daoWallet;
	address public earlyFoundersWallet;
	uint256 public totalStakedToken = 1;  // init with 1 instead of 0 to avoid division by zero

	IERC20 public stakedToken;
	IERC20 public rewardToken;

	/* ========== CONSTRUCTOR ========== */

	constructor (
		address _stakedToken,
		address _rewardToken,
		uint256 _rewardPerBlock,
		uint256 _daoShare,
		uint256 _earlyFoundersShare,
		address _daoWallet,
		address _earlyFoundersWallet)
	{
		require(
			_stakedToken != address(0) &&
			_rewardToken != address(0) &&
			_daoWallet != address(0) &&
			_earlyFoundersWallet != address(0),
			"STAKING::constructor: Zero address detected"
		);
		stakedToken = IERC20(_stakedToken);
		rewardToken = IERC20(_rewardToken);
		rewardPerBlock = _rewardPerBlock;
		daoShare = _daoShare;
		earlyFoundersShare = _earlyFoundersShare;
		lastUpdatedBlock = block.number;
		daoWallet = _daoWallet;
		earlyFoundersWallet = _earlyFoundersWallet;
	}

	/* ========== VIEWS ========== */

	// View function to see pending reward on frontend.
	function pendingReward(address _user) external view returns (uint256) {
		User storage user = users[_user];
		uint256 accRewardPerToken = rewardTillNowPerToken;

		if (block.number > lastUpdatedBlock) {
			uint256 rewardAmount = (block.number - lastUpdatedBlock) * rewardPerBlock;
			accRewardPerToken = accRewardPerToken + (rewardAmount * scale / totalStakedToken);
		}
		uint256 reward = (user.depositAmount * accRewardPerToken / scale) - user.paidReward;
		return reward * (1 - daoShare) / scale;
	}

	/* ========== PUBLIC FUNCTIONS ========== */

	// Update reward variables of the pool to be up-to-date.
	function update() public {
		if (block.number <= lastUpdatedBlock) {
			return;
		}

		uint256 rewardAmount = (block.number - lastUpdatedBlock) * rewardPerBlock;

		rewardTillNowPerToken = rewardTillNowPerToken + (rewardAmount * scale / totalStakedToken);
		lastUpdatedBlock = block.number;
	}

	function deposit(uint256 amount) external {
		depositFor(msg.sender, amount);
	}

	function depositFor(address _user, uint256 amount) public {
		User storage user = users[_user];
		update();

		if (user.depositAmount > 0) {
			uint256 _pendingReward = (user.depositAmount * rewardTillNowPerToken / scale) - user.paidReward;
			sendReward(_user, pendingReward);
		}

		user.depositAmount = user.depositAmount + amount;
		user.paidReward = user.depositAmount * rewardTillNowPerToken / scale;

		stakedToken.transferFrom(msg.sender, address(this), amount);
		totalStakedToken = totalStakedToken + amount;
		emit Deposit(msg.sender, amount);
	}

	function withdraw(uint256 amount) external {
		User storage user = users[msg.sender];
		require(user.depositAmount >= amount, "STAKING::withdraw: withdraw amount exceeds deposited amount");
		update();

		uint256 _pendingReward = (user.depositAmount * rewardTillNowPerToken / scale) - user.paidReward;
		sendReward(msg.sender, _pendingReward);

		uint256 particleCollectorShare = _pendingReward *‌ (daoShare +‌ earlyFoundersShare) / scale;
		particleCollector = particleCollector + ‌particleCollectorShare;

		if (amount > 0) {
			user.depositAmount = user.depositAmount - amount;
			stakedToken.transfer(address(msg.sender), amount);
			totalStakedToken = totalStakedToken - amount;
			emit Withdraw(msg.sender, amount);
		}

		user.paidReward = user.depositAmount * rewardTillNowPerToken / scale;
	}

	function withdrawParticleCollector() external {
		uint256 _daoShare = particleCollector *‌ daoShare / (daoShare +‌ earlyFoundersShare);
		rewardToken.transfer(daoWallet, _daoShare);

		uint256 _earlyFoundersShare = particleCollector * earlyFoundersShare / (daoShare +‌ earlyFoundersShare);
		rewardToken.transfer(earlyFoundersWallet, _earlyFoundersShare);

		particleCollector = 0;

		emit WithdrawParticleCollector(_earlyFoundersShare);
	}

	// Withdraw without caring about rewards. EMERGENCY ONLY.
	function emergencyWithdraw() external {
		User storage user = users[msg.sender];

		totalStakedToken = totalStakedToken - user.depositAmount;
		stakedToken.transfer(msg.sender, user.depositAmount);

		emit EmergencyWithdraw(msg.sender, user.depositAmount);

		user.depositAmount = 0;
		user.paidReward = 0;
	}

	function sendReward(address user, uint256 amount) private {
		uint256 _daoShare = amount * daoShare / scale;
		rewardToken.transfer(user, amount - _daoShare);
		emit RewardClaimed(user, amount);
	}

	/* ========== EMERGENCY FUNCTIONS ========== */

	// Add temporary withdrawal functionality for owner(DAO) to transfer all tokens to a safe place.
	// Contract ownership will transfer to address(0x) after full auditing of codes.
	function withdrawAllRewardTokens(address to) external onlyOwner {
		uint256 totalRewardTokens = rewardToken.balanceOf(address(this));
		rewardToken.transfer(to, totalRewardTokens);
	}

	// Add temporary withdrawal functionality for owner(DAO) to transfer all tokens to a safe place.
	// Contract ownership will transfer to address(0x) after full auditing of codes.
	function withdrawAllStakedtokens(address to) external onlyOwner {
		uint256 totalStakedTokens = stakedToken.balanceOf(address(this));
		stakedToken.transfer(to, totalStakedTokens);
	}

	function withdrawERC20(address to, address _token, uint256 amount) external onlyOwner {
		IERC20(_token).transfer(to, amount);
	}

	function setWallets(address _daoWallet, address _earlyFoundersWallet) public onlyOwner {
		daoWallet = _daoWallet;
		earlyFoundersWallet = _earlyFoundersWallet;

		emit WalletsSet(_daoWallet, _earlyFoundersWallet);
	}

	function setShares(uint256 _daoShare, uint256 _earlyFoundersShare) public onlyOwner {
		withdrawParticleCollector();
		daoShare = _daoShare;
		earlyFoundersShare = _earlyFoundersShare;

		emit SharesSet(_daoShare, _earlyFoundersShare);
	}

	function setRewardPerBlock(uint256 _rewardPerBlock) public onlyOwner {
		update();
		emit RewardPerBlockChanged(rewardPerBlock, _rewardPerBlock);
		rewardPerBlock = _rewardPerBlock;
	}


	/* ========== EVENTS ========== */

	event SharesSet(uint256 _daoShare, uint256 _earlyFoundersShare);
	event WithdrawParticleCollector(uint256 _earlyFoundersShare);
	event WalletsSet(address _daoWallet, address _earlyFoundersWallet);
	event Deposit(address user, uint256 amount);
	event Withdraw(address user, uint256 amount);
	event EmergencyWithdraw(address user, uint256 amount);
	event RewardClaimed(address user, uint256 amount);
	event RewardPerBlockChanged(uint256 oldValue, uint256 newValue);
}

//Dar panah khoda
