// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IMasterChefV2.sol";
import "./interfaces/IMintableToken.sol";
import "./interfaces/INftValueCalculator.sol";
import "./interfaces/IMintHelper.sol";

contract Staking is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct UserDeposit {
        uint256 nftId;
        uint256 amount;
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
    mapping(address => uint256) public userNftIndex;
    // user => nft index => nft id
    mapping(address => mapping(uint256 => uint256)) public userNfts;

    // nft => user
    mapping(uint256 => address) public nftUser;
    // nft => pool
    mapping(uint256 => uint256) public nftPool;
    // nft => depsoit
    mapping(uint256 => UserDeposit) public nftDeposit;

    bool public freeExit;

    bytes32 public constant SETTER_ROLE = keccak256("SETTER_ROLE");
    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");
    bytes32 public constant EXTRACTOR_ROLE = keccak256("EXTRACTOR_ROLE");

    event ToggleFreeExit(bool freeExit);
    event SetPool(uint256 poolId, uint256 lockDuration, address token);
    event SetNft(address oldNft, address newNft);
    event SetNftValueCalculator(
        address oldNftValueCalculator,
        address newNftValueCalculator
    );
    event SetMasterChef(address oldMasterChef, address newMasterChef);
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
        uint256 user,
        uint256 nftId,
        address deiAmount,
        uint256 usdcAmount 
    );

    constructor(
        address dei_,
        address usdc_,
        address nft_,
        address nftValueCalculator_,
        address masterChef_,
        address mintHelper_,
        address setter,
        address poolManager,
        address admin
    ) public ReentrancyGuard() {
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

        IERC20(token).approve(masterChef, type(uint256).max);

        emit SetPool(poolId, lockDuration, token);
    }

    function toggleFreeExit() external onlyRole(SETTER_ROLE) {
        freeExit = !freeExit;
        emit ToggleFreeExit(freeExit);
    }

    function approve(uint256 poolId, uint256 amount) external {
        IERC20(pools[poolId].token).approve(masterChef, amount);
    }

    function getNftValue(uint256 nftId) public view returns (uint256 value) {
        return INftValueCalculator(nftValueCalculator).getNftValue(nftId);
    }

    // todo update this view
    function userNfts(uint256 poolId, address user)
        external
        view
        returns (uint256[] memory nfts)
    {
        nfts = new uint256[](
            userDeposits[poolId][user].length -
                validUserDepositIndex[poolId][user]
        );
        uint256 index = 0;
        for (
            uint256 i = validUserDepositIndex[poolId][user];
            i < userDeposits[poolId][user].length;
            i++
        ) {
            nfts[index] = userDeposits[poolId][user][i].nftId;
            index++;
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
        nftUser[nftId] = to;
        nftPool[nftId] = poolId;
        userNfts[to][userNftIndex[to]] = nftId;
        userNftIndex[to] += 1;

        IMintableToken(pools[poolId].token).mint(address(this), amount);

        IMasterChefV2(masterChef).deposit(poolId, amount, to);

        emit Deposit(msg.sender, poolId, nftId, to, amount);
    }

    function exitFor(uint256 nftId) external nonReentrant {
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

        IMasterChefV2(masterChef).withdraw(poolId, amount, address(this));

        IMintableToken(pools[poolId].token).burnFrom(address(this), amount);

        // IERC721(nft).safeTransferFrom(address(this), user, nftId);
        emit ExitFor(msg.sender, nftUser[nftId], nftId, amount);
    }

    function withdrawTo(uint256 nftId, address to) external nonReentrant {
        require(
            nftUser[nftId] == msg.sender,
            "Staking: SENDER_IS_NOT_NFT_ONWER"
        );
        require(
            nftDeposit[nftId].isWithdrawn == false,
            "Staking: NFT_IS_WITHDRAWN"
        );

        if (nftDeposit[nftId].isExited == false) {
            exitFor(nftId);
        }
        nftDeposit[nftId].isWithdrawn = true;
        nftUser[nftId] = address(0);

        userNftIndex[msg.sender] -= 1;
        userNfts[msg.sender][nftId] = userNfts[msg.sender][
            userNftIndex[msg.sender]
        ];

        uint256 amount = nftDeposit[nftId].amount;

        if (freeExit) {
            IERC721(nft).safeTransferFrom(address(this), to, nftId);
        } else {
            (uint256 deiAmount, uint256 usdcAmount) = INftValueCalculator(
                nftValueCalculator
            ).getNftRedeemValues(nftId);

            IERC20(usdc).safeTransferFrom(
                msg.sender,
                address(this),
                usdcAmount
            );

            IMintHelper(mintHelper).mint(to, deiAmount);
        }

        emit WithdrawTo(msg.sender, to, nftId, deiAmount, usdcAmount);
    }

    function emergencyWithdrawERC20(
        address token,
        address to,
        uint256 amount
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(to, amount);
    }

    function emergencyWithdrawERC721(
        address token,
        uint256 tokenId,
        address to
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC721(token).safeTransferFrom(address(this), to, tokenId);
    }
}
