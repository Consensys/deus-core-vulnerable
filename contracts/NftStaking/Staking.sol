// SPDX-License-Identifier: MIT
// Be name Khoda

pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IMasterChefV2.sol";
import "./interfaces/IMintableToken.sol";
import "./interfaces/INftValueCalculator.sol";
import "./interfaces/IMintHelper.sol";
import "./interfaces/INFTStaking.sol";

/// @title vDeus staking
/// @author Deus Finance
contract NFTStaking is
    INFTStaking,
    Initializable,
    ERC721HolderUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct UserDeposit {
        uint256 nftId;
        uint256 amount; // amount of nft measured in dei(we assume dei is 1)
        uint256 depositTimestamp;
        bool isWithdrawn;
        bool isExited;
    }

    struct Pool {
        uint256 poolId;
        address token;
        uint256 lockDuration;
    }

    address public nft;
    address public dei;
    address public usdc;
    address public nftValueCalculator;
    address public masterChef;
    address public mintHelper;

    // user => nft index
    mapping(address => uint256) public userNftIndex; // count of nft a user has
    // user => nft index => nft id
    mapping(address => mapping(uint256 => uint256)) public userNfts;

    // nft => user
    mapping(uint256 => address) public nftUser;
    // nft => pool
    mapping(uint256 => uint256) public nftPool;
    // nft => depsoit
    mapping(uint256 => UserDeposit) public nftDeposit;
    // poolId => Pool
    mapping(uint256 => Pool) public pools;

    bool public freeExit;

    bytes32 public constant SETTER_ROLE = keccak256("SETTER_ROLE");
    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");
    bytes32 public constant EXTRACTOR_ROLE = keccak256("EXTRACTOR_ROLE");

    mapping(address => bool) public blackList;

    event ToggleFreeExit(bool freeExit);
    event SetPool(uint256 poolId, uint256 lockDuration, address token);
    event SetNft(address oldNft, address newNft);
    event SetNftValueCalculator(
        address oldNftValueCalculator,
        address newNftValueCalculator
    );
    event SetMasterChef(address oldMasterChef, address newMasterChef);
    event SetMintHelper(address oldMintHelper, address newMintHelper);
    event Deposit(
        address sender,
        uint256 poolId,
        uint256 nftId,
        address to,
        uint256 amount
    );
    event ExitFor(address sender, address user, uint256 nftId, uint256 amount);
    event WithdrawTo(
        address sender,
        address user,
        uint256 nftId,
        uint256 deiAmount,
        uint256 usdcAmount
    );

    function initialize(
        address dei_,
        address usdc_,
        address nft_,
        address nftValueCalculator_,
        address masterChef_,
        address mintHelper_,
        address setter,
        address poolManager,
        address admin
    ) public initializer {
        __ERC721Holder_init();
        __AccessControl_init();
        __ReentrancyGuard_init();

        dei = dei_;
        usdc = usdc_;
        nft = nft_;
        nftValueCalculator = nftValueCalculator_;
        masterChef = masterChef_;
        mintHelper = mintHelper_;

        _setupRole(SETTER_ROLE, setter);
        _setupRole(POOL_MANAGER_ROLE, poolManager);
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setNft(address nft_) external onlyRole(SETTER_ROLE) {
        emit SetNft(nft, nft_);
        nft = nft_;
    }

    function setBlackList(address user, bool isBlocked)
        external
        onlyRole(SETTER_ROLE)
    {
        blackList[user] = isBlocked;
    }

    function setNftValueCalculator(address nftValueCalculator_)
        external
        onlyRole(SETTER_ROLE)
    {
        emit SetNftValueCalculator(nftValueCalculator, nftValueCalculator_);
        nftValueCalculator = nftValueCalculator_;
    }

    function setMasterChef(address masterChef_) external onlyRole(SETTER_ROLE) {
        emit SetMasterChef(masterChef, masterChef_);
        masterChef = masterChef_;
    }

    function setMintHelper(address mintHelper_) external onlyRole(SETTER_ROLE) {
        emit SetMintHelper(mintHelper, mintHelper_);
        mintHelper = mintHelper_;
    }

    function setPool(
        uint256 poolId,
        address token,
        uint256 lockDuration
    ) external onlyRole(POOL_MANAGER_ROLE) {
        pools[poolId] = Pool({
            poolId: poolId,
            token: token,
            lockDuration: lockDuration
        });

        IERC20Upgradeable(token).approve(masterChef, type(uint256).max);

        emit SetPool(poolId, lockDuration, token);
    }

    function toggleFreeExit() external onlyRole(SETTER_ROLE) {
        freeExit = !freeExit;
        emit ToggleFreeExit(freeExit);
    }

    function approve(uint256 poolId, uint256 amount)
        external
        onlyRole(POOL_MANAGER_ROLE)
    {
        IERC20Upgradeable(pools[poolId].token).approve(masterChef, amount);
    }

    function getNftValue(uint256 nftId) public view returns (uint256 value) {
        (value, ) = INftValueCalculator(nftValueCalculator).getNftRedeemValues(
            nftId
        );
    }

    function userNftDeposits(address user)
        external
        view
        returns (UserDeposit[] memory nfts)
    {
        uint256 userBalance = userNftIndex[user];
        nfts = new UserDeposit[](userBalance);
        for (uint256 i = 0; i < userBalance; i++) {
            nfts[i] = nftDeposit[userNfts[user][i]];
        }
    }

    function deposit(
        uint256 poolId,
        uint256 nftId,
        address to
    ) external nonReentrant {
        IERC721(nft).safeTransferFrom(msg.sender, address(this), nftId);

        uint256 amount = getNftValue(nftId);

        nftDeposit[nftId] = UserDeposit({
            nftId: nftId,
            amount: amount,
            depositTimestamp: block.timestamp,
            isWithdrawn: false,
            isExited: false
        });
        nftUser[nftId] = to; // owner of nft
        nftPool[nftId] = poolId; // staked in this pool
        userNfts[to][userNftIndex[to]] = nftId; // users nfts
        userNftIndex[to] += 1; // next deposit index

        IMintableToken(pools[poolId].token).mint(address(this), amount);

        IMasterChefV2(masterChef).deposit(poolId, amount, to);

        emit Deposit(msg.sender, poolId, nftId, to, amount);
    }

    function exitFor(uint256 nftId) public nonReentrant {
        require(
            nftUser[nftId] == msg.sender || hasRole(EXTRACTOR_ROLE, msg.sender),
            "Staking: EXIT_FORBIDDEN"
        );
        require(
            nftDeposit[nftId].isExited == false,
            "Staking: NFT_ALREADY_EXITED"
        );

        nftDeposit[nftId].isExited = true;

        uint256 poolId = nftPool[nftId];

        uint256 amount = nftDeposit[nftId].amount;

        require(
            freeExit ||
                nftDeposit[nftId].depositTimestamp +
                    pools[poolId].lockDuration <=
                block.timestamp,
            "Staking: DEPOSIT_IS_LOCKED"
        );

        IMasterChefV2(masterChef).withdrawAndHarvest(
            poolId,
            amount,
            nftUser[nftId],
            address(this)
        );

        IMintableToken(pools[poolId].token).burnFrom(address(this), amount);

        emit ExitFor(msg.sender, nftUser[nftId], nftId, amount);
    }

    function withdrawTo(uint256 nftIndex, address to) external nonReentrant {
        uint256 nftId = userNfts[msg.sender][nftIndex];
        require(
            nftUser[nftId] == msg.sender,
            "Staking: SENDER_IS_NOT_NFT_ONWER"
        );
        require(
            nftDeposit[nftId].isWithdrawn == false,
            "Staking: NFT_IS_WITHDRAWN"
        );
        require(
            blackList[nftUser[nftId]] == false,
            "Staking: BLACK_LISTED_ADDRESS"
        );

        if (nftDeposit[nftId].isExited == false) {
            exitFor(nftId);
        }
        nftDeposit[nftId].isWithdrawn = true;
        nftUser[nftId] = address(0);

        userNftIndex[msg.sender] -= 1;
        userNfts[msg.sender][nftIndex] = userNfts[msg.sender][
            userNftIndex[msg.sender]
        ];
        userNfts[msg.sender][userNftIndex[msg.sender]] = 0;

        if (freeExit) {
            IERC721(nft).safeTransferFrom(address(this), to, nftId);
            emit WithdrawTo(msg.sender, to, nftId, 0, 0);
        } else {
            (uint256 deiAmount, uint256 usdcAmount) = INftValueCalculator(
                nftValueCalculator
            ).getNftRedeemValues(nftId);

            IERC20Upgradeable(usdc).safeTransferFrom(
                msg.sender,
                address(this),
                usdcAmount
            );

            IMintHelper(mintHelper).mint(to, deiAmount);
            emit WithdrawTo(msg.sender, to, nftId, deiAmount, usdcAmount);
        }
    }

    function emergencyWithdrawERC20(
        address token,
        address to,
        uint256 amount
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20Upgradeable(token).safeTransfer(to, amount);
    }

    function emergencyWithdrawERC721(
        address token,
        uint256 tokenId,
        address to
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC721(token).safeTransferFrom(address(this), to, tokenId);
    }
}
