// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./BoringMath.sol";
import "./Ownable.sol";
import "./SafeERC20.sol";
import "./SignedSafeMath.sol";
import "./IRewarder.sol";

contract MasterChefV2 is Ownable {
    using BoringMath for uint256;
    using BoringMath128 for uint128;
    using SafeERC20 for IERC20;
    using SignedSafeMath for int256;

    /// @notice Info of each MCV2 user.
    /// `amount` LP token amount the user has provided.
    /// `rewardDebt` The amount of DEUS entitled to the user.
    struct UserInfo {
        uint256 amount;
        int256 rewardDebt;
    }

    /// @notice Info of each MCV2 pool.
    /// `allocPoint` The amount of allocation points assigned to the pool.
    /// Also known as the amount of DEUS to ditro per block.
    struct PoolInfo {
        uint128 accTokensPerShare;
        uint64 lastRewardBlock;
        uint64 allocPoint;
    }

    /// @notice Address of DEUS contract.
    IERC20 public DEUS;
    /// @notice Info of each MCV2 pool.
    PoolInfo[] public poolInfo;
    /// @notice Address of the LP token for each MCV2 pool.
    IERC20[] public lpToken;
    /// @notice Address of IRewarder cobtraact
    IRewarder public rewarder;

    /// @notice Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    /// @dev Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint;
    uint256 public tokenPerBlock;
    uint256 private constant ACC_TOKEN_PRECISION = 1e12;

    address public staking;

    event Deposit(
        address indexed user,
        uint256 indexed pid,
        uint256 amount,
        address indexed to
    );
    event Withdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount,
        address indexed to
    );
    event EmergencyWithdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount,
        address indexed to
    );
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event LogPoolAddition(
        uint256 indexed pid,
        uint256 allocPoint,
        IERC20 indexed lpToken
    );
    event LogSetPool(uint256 indexed pid, uint256 allocPoint);
    event LogUpdatePool(
        uint256 indexed pid,
        uint64 lastRewardBlock,
        uint256 lpSupply,
        uint256 accTokensPerShare
    );
    event LogSetTokenPerBlock(uint256 oldValue, uint256 newValue);
    event LogInit();

    /// @param _deus The DEUS token contract address.
    /// @param _rewarder Address of Rewarder contract
    constructor(
        IERC20 _deus,
        IRewarder _rewarder,
        uint256 _tokenPerBlock,
        address _staking
    ) public {
        DEUS = _deus;
        rewarder = _rewarder;
        tokenPerBlock = _tokenPerBlock;
        staking = _staking;
    }

    modifier onlyStaking() {
        require(msg.sender == staking, "MasterChefV2: sender is not staking");
        _;
    }

    function setStaking(address _staking) external onlyOwner {
        staking = _staking;
    }

    /// @notice Returns the number of MCV2 pools.
    function poolLength() public view returns (uint256 pools) {
        pools = poolInfo.length;
    }

    function setRewarder(IRewarder _rewarder) external onlyOwner {
        rewarder = _rewarder;
    }

    function setTokenPerBlock(uint256 _tokenPerBlock) external onlyOwner {
        for (uint256 i = 0; i < poolInfo.length; i++) {
            updatePool(i);
        }
        emit LogSetTokenPerBlock(tokenPerBlock, _tokenPerBlock);
        tokenPerBlock = _tokenPerBlock;
    }

    /// @notice Add a new LP to the pool. Can only be called by the owner.
    /// DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    /// @param allocPoint AP of the new pool.
    /// @param _lpToken Address of the LP ERC-20 token.
    function add(uint256 allocPoint, IERC20 _lpToken) public onlyOwner {
        uint256 lastRewardBlock = block.number;
        totalAllocPoint = totalAllocPoint.add(allocPoint);
        lpToken.push(_lpToken);

        poolInfo.push(
            PoolInfo({
                allocPoint: allocPoint.to64(),
                lastRewardBlock: lastRewardBlock.to64(),
                accTokensPerShare: 0
            })
        );
        emit LogPoolAddition(lpToken.length.sub(1), allocPoint, _lpToken);
    }

    /// @notice Update the given pool's DEUS allocation point and `IRewarder` contract. Can only be called by the owner.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _allocPoint New AP of the pool.
    function set(uint256 _pid, uint256 _allocPoint) public onlyOwner {
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(
            _allocPoint
        );
        poolInfo[_pid].allocPoint = _allocPoint.to64();
        emit LogSetPool(_pid, _allocPoint);
    }

    /// @notice View function to see pending DEUS on frontend.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _user Address of user.
    /// @return pending DEUS reward for a given user.
    function pendingTokens(uint256 _pid, address _user)
        external
        view
        returns (uint256 pending)
    {
        PoolInfo memory pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accTokensPerShare = pool.accTokensPerShare;
        uint256 lpSupply = lpToken[_pid].balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 blocks = block.number.sub(pool.lastRewardBlock);
            uint256 tokenReward = blocks.mul(tokenPerBlock).mul(
                pool.allocPoint
            ) / totalAllocPoint;
            accTokensPerShare = accTokensPerShare.add(
                tokenReward.mul(ACC_TOKEN_PRECISION) / lpSupply
            );
        }
        pending = int256(
            user.amount.mul(accTokensPerShare) / ACC_TOKEN_PRECISION
        ).sub(user.rewardDebt).toUInt256();
    }

    /// @notice Update reward variables for all pools. Be careful of gas spending!
    /// @param pids Pool IDs of all to be updated. Make sure to update all active pools.
    function massUpdatePools(uint256[] calldata pids) external {
        uint256 len = pids.length;
        for (uint256 i = 0; i < len; ++i) {
            updatePool(pids[i]);
        }
    }

    /// @notice Update reward variables of the given pool.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @return pool Returns the pool that was updated.
    function updatePool(uint256 pid) public returns (PoolInfo memory pool) {
        pool = poolInfo[pid];
        if (block.number > pool.lastRewardBlock) {
            uint256 lpSupply = lpToken[pid].balanceOf(address(this));
            if (lpSupply > 0) {
                uint256 blocks = block.number.sub(pool.lastRewardBlock);
                uint256 tokenReward = blocks.mul(tokenPerBlock).mul(
                    pool.allocPoint
                ) / totalAllocPoint;
                pool.accTokensPerShare = pool.accTokensPerShare.add(
                    (tokenReward.mul(ACC_TOKEN_PRECISION) / lpSupply).to128()
                );
            }
            pool.lastRewardBlock = block.number.to64();
            poolInfo[pid] = pool;
            emit LogUpdatePool(
                pid,
                pool.lastRewardBlock,
                lpSupply,
                pool.accTokensPerShare
            );
        }
    }

    /// @notice Deposit LP tokens to MCV2 for DEUS allocation.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to deposit.
    /// @param to The receiver of `amount` deposit benefit.
    function deposit(
        uint256 pid,
        uint256 amount,
        address to
    ) public onlyStaking {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][to];

        // Effects
        user.amount = user.amount.add(amount);
        user.rewardDebt = user.rewardDebt.add(
            int256(amount.mul(pool.accTokensPerShare) / ACC_TOKEN_PRECISION)
        );

        // Interactions
        if (address(rewarder) != address(0)) {
            rewarder.onReward(pid, msg.sender, user.amount);
        }

        lpToken[pid].safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, pid, amount, to);
    }

    /// @notice Withdraw LP tokens from MCV2.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to withdraw.
    /// @param to Receiver of the LP tokens.
    function withdraw(
        uint256 pid,
        uint256 amount,
        address to
    ) public onlyStaking {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][msg.sender];

        // Effects
        user.rewardDebt = user.rewardDebt.sub(
            int256(amount.mul(pool.accTokensPerShare) / ACC_TOKEN_PRECISION)
        );
        user.amount = user.amount.sub(amount);

        // Interactions
        if (address(rewarder) != address(0)) {
            rewarder.onReward(pid, msg.sender, user.amount);
        }

        lpToken[pid].safeTransfer(to, amount);

        emit Withdraw(msg.sender, pid, amount, to);
    }

    /// @notice Harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param to Receiver of DEUS rewards.
    function harvest(uint256 pid, address to) public {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][msg.sender];
        int256 accumulatedTokens = int256(
            user.amount.mul(pool.accTokensPerShare) / ACC_TOKEN_PRECISION
        );
        uint256 _pendingTokens = accumulatedTokens
            .sub(user.rewardDebt)
            .toUInt256();

        // Effects
        user.rewardDebt = accumulatedTokens;

        // Interactions
        if (_pendingTokens != 0) {
            DEUS.safeTransfer(to, _pendingTokens);
        }

        if (address(rewarder) != address(0)) {
            rewarder.onReward(pid, msg.sender, user.amount);
        }

        emit Harvest(msg.sender, pid, _pendingTokens);
    }

    /// @notice Withdraw LP tokens from MCV2 and harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to withdraw.
    /// @param to Receiver of the LP tokens and DEUS rewards.
    function withdrawAndHarvest(
        uint256 pid,
        uint256 amount,
        address to
    ) public onlyStaking {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][msg.sender];
        int256 accumulatedTokens = int256(
            user.amount.mul(pool.accTokensPerShare) / ACC_TOKEN_PRECISION
        );
        uint256 _pendingTokens = accumulatedTokens
            .sub(user.rewardDebt)
            .toUInt256();

        // Effects
        user.rewardDebt = accumulatedTokens.sub(
            int256(amount.mul(pool.accTokensPerShare) / ACC_TOKEN_PRECISION)
        );
        user.amount = user.amount.sub(amount);

        // Interactions
        DEUS.safeTransfer(to, _pendingTokens);

        if (address(rewarder) != address(0)) {
            rewarder.onReward(pid, msg.sender, user.amount);
        }

        lpToken[pid].safeTransfer(to, amount);

        emit Withdraw(msg.sender, pid, amount, to);
        emit Harvest(msg.sender, pid, _pendingTokens);
    }

    /// @notice Withdraw without caring about rewards. EMERGENCY ONLY.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param to Receiver of the LP tokens.
    function emergencyWithdraw(uint256 pid, address to) public onlyStaking {
        UserInfo storage user = userInfo[pid][msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;

        if (address(rewarder) != address(0)) {
            rewarder.onReward(pid, msg.sender, 0);
        }

        // Note: transfer can fail or succeed if `amount` is zero.
        lpToken[pid].safeTransfer(to, amount);
        emit EmergencyWithdraw(msg.sender, pid, amount, to);
    }
}
