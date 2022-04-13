const path = require("path");
const envPath = path.join(__dirname, "./.env");
require("dotenv").config({ path: envPath });

require("hardhat-deploy");
require("hardhat-contract-sizer");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");
// require("@nomiclabs/hardhat-vyper");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: {
        mnemonic:
          "weekend friend since level unaware voyage lazy spring put three grunt power",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 5,
      },
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 3,
      gas: "auto",
      minGasPrice: 1000000000,
      initialBaseFeePerGas: 360000000,
      gasPrice: "auto",
      gasMultiplier: 1.2,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 4,
      gas: "auto",
      gasPrice: 3100000000,
      gasMultiplier: 1.2,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 1,
      gas: "auto",
      gasPrice: 77100000000,
      gasMultiplier: 1.2,
    },
    heco: {
      url: "https://http-mainnet.hecochain.com",
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 128,
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1.2,
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 43114,
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1.2,
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 43113,
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1.2,
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 137,
      gas: "auto",
      gasPrice: 36100000000,
      gasMultiplier: 1.2,
    },
    fantom: {
      url: "https://rpc.fantom.network",
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 250,
      gas: "auto",
      gasPrice: 600100000000, //500.1 Gwei
      gasMultiplier: 1.2,
    },
    bsctest: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 97,
      gas: "auto",
      gasPrice: 10e9, // 10 Gwei
      gasMultiplier: 1.2,
    },
    bsc: {
      url: "https://bsc-dataseed1.ninicoin.io/",
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 56,
      gas: "auto",
      gasPrice: 10e9, // 10 Gwei
      gasMultiplier: 1.2,
    },
    metis: {
      url: "https://andromeda.metis.io/?owner=1088",
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 1088,
      gas: "auto",
      gasPrice: 23e9, // 23 Gwei
      gasMultiplier: 1.2,
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      chainId: 42161,
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1.2,
    },
    localhostOptimism: {
      url: "http://127.0.0.1:8547/",
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
    },
    localhostMainnet: {
      url: "http://127.0.0.1:8545/",
      accounts: [
        process.env.MAIN_DEPLOYER_PRIVATE_KEY,
        process.env.SECOND_DEPLOYER_PRIVATE_KEY,
        process.env.DEI_DEPLOYER_PRIVATE_KEY,
        process.env.DEUS_DEPLOYER_PRIVATE_KEY,
        process.env.veDEUS_DEPLOYER_PRIVATE_KEY,
      ],
      gas: 30000000,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.5.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: "0.6.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: "0.8.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: "0.8.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 360000,
  },
  etherscan: {
    // apiKey: process.env.ETHERSCAN_API_KEY, // ETH Mainnet
    apiKey: process.env.FANTOM_API_KEY, // FANTOM Mainnet
    // apiKey: process.env.POLYGON_API_KEY, // Polygon
    // apiKey: process.env.HECO_API_KEY, // HECO Mainnet
    // apiKey: process.env.BSCSCAN_API_KEY // BSC
    // apiKey: process.env.ARBISCAN_API_KEY, // Arbitrum
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  vyper: {
    version: "0.2.12",
  },
};
