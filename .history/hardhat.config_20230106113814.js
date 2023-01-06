require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

import "./tasks/accounts";
import "./tasks/deploy";


const chainIds = {
  "arbitrum-mainnet": 42161,
  avalanche: 43114,
  bsc: 56,
  bscTest: 97,
  hardhat: 31337,
  mainnet: 1,
  "optimism-mainnet": 10,
  "polygon-mainnet": 137,
  "polygon-mumbai": 80001,
  sepolia: 11155111,
};

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        initialIndex: 0,
        path: "m/44'/60'/0'/0",
        count: 11,
        accountsBalance: "5000000000000000000000000000",
        passphrase: ""
      }
    },
    confluxTestnet: {
      url: "https://test.confluxrpc.com",
      accounts: [process.env.PRIVATE_KEY1],
      chainId: 1,
    },
    confluxMainnet: {
      url: "https://main.confluxrpc.com",
      accounts: [process.env.PRIVATE_KEY1],
      chainId: 1029,
    }
  }
};
