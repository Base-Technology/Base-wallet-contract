require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("dotenv").config();



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
  solidity: {
    version: "0.8.4",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: 
      [
      //   {
      //   mnemonic: "test test test test test test test test test test test junk",
      //   initialIndex: 0,
      //   path: "m/44'/60'/0'/0",
      //   count: 11,
      //   accountsBalance: "5000000000000000000000000000",
      //   passphrase: ""
      // },
      {
        //address: '0x1f2825f8C1B36f8A064D03918c92a09058A69f89',
        privateKey: '0x78af0919f8f8187b7944f72f9f37b28e0ec2c145697109659c957910da51e616',
        balance: "5000000000000000000000000000",
      },
      {
        //address: '0x3AA32DD4189A84A162893a70475a20db70130a6B',
        privateKey: '0xa866c60a068d13d9ca3fc39aba66f88035585cfe6d64860ba0a0447737418481',
        balance: "5000000000000000000000000000",
      },
      {
        //address: '0xF0fD8d36639436c188D0e7C7A7695e6D2e992F27',
        privateKey: '0xf101af74402bfcff49541f4484e084db76fac0013902e87e71033a639b09d347',
        balance: "5000000000000000000000000000",
      },
      {
        //address: '0xDA43a1629FCc19D96780327E37B9a99BFCFa605d',
        privateKey: '0xf9c5f2a4055fb0700d75c6e6c735b61e6c4d8f477bc3f5dfc5c2ad0f77ac40b7',
        balance: "5000000000000000000000000000",
      },
      {
        //address: '0xe0aDA96b7002D14b6669fe829999cBdD9F11B49D',
        privateKey: '0x9a04751c93968de693be3b543690ff3858d15079e0e21ebb19afb52fc900cf72',
        balance: "5000000000000000000000000000",
      },
      {
        //address: '0x558EF23F1392234A1007d2c10e87B007bA085B10',
        privateKey: '0xddee60720c958336c37f5fae234acd3f9ec3ce0afe14176e410c3552e4f92089',
        balance: "5000000000000000000000000000",
      },
      {
        //address: '0x4F67F1bDC1318D38AA45E90eEF8c777BD69E64c9',
        privateKey: '0x4f9819e28540365df26527ce5335f5d5da4e7fdc4482c9c774c0a718cdeb788c',
        balance: "5000000000000000000000000000",
      },
      {
        //address: '0x200b2284a77440d7618c0A1a852BBCa1b4eC76e8',
        privateKey: '0xcf2104b59bca42cbea081db922c3894de18f7adc164bfd517c91420265833541',
        balance: "5000000000000000000000000000",
      },
      {
        //address: '0x074280AEd002B0A38B0dF11d3Ca079d405ef8886',
        privateKey: '0xa9518cb0711f1dff8bb45071f740d8d396142eb0f32514a76e3266fbc7fc16d2',
        balance: "5000000000000000000000000000",
      },
      {
        //address: '0xaE0f578796351BA3091A3Da943891DC374aEf502',
        privateKey: '0x64fb9e24f306375d62258f7eb0523305bd7d1ab37deaa63bcbd06ffacf9ce323',
        balance: "5000000000000000000000000000",
      },
      {
        //address: '0xD4F2DfBD73dC47520BBD80129E8ebBf14e5A660A',
        privateKey: '0x47fc88cf2b5872366cfff978f79044f3a0d72a1b7370f836778c036127b52ba4',
        balance: "5000000000000000000000000000",
      }
    ],
      allowUnlimitedContractSize: true,
    },
    bscTest: {
      url: "https://bsc-testnet.public.blastapi.io",
      accounts: [process.env.PRIVATE_KEY1],
      chainId: 97,
      allowUnlimitedContractSize: true,
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
