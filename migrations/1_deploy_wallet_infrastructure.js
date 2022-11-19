global.web3 = web3;
global.artifacts = artifacts;

const ethers = require("ethers");

const GuardianStorage = artifacts.require("GuardianStorage");
// const TransferStorage = artifacts.require("TransferStorage");
// const Proxy = artifacts.require("Proxy");
// const BaseWallet = artifacts.require("BaseWallet");
// const ModuleRegistry = artifacts.require("ModuleRegistry");
// const Factory = artifacts.require("Factory");
// const WalletDetector = artifacts.require("WalletDetector");

// const utils = require("../utils/utilities.js");

async function main() {
    // const accounts = await web3.eth.getAccounts();
    
    // const {configurator} = await deployManager.getProps();
    // const { config } = configurator;

    // Deploy the Guardian Storage
    const GuardianStorageWrapper = await GuardianStorage.new();
    console.log("Deployed GuardianStorageWrapper at ", GuardianStorageWrapper.address);
    // Deploy the Transfer Storage
    // const TransferStorageWrapper = await TransferStorage.new();
    // console.log("Deployed TransferStorageWrapper at ", TransferStorageWrapper.address);

    // // Deploy the Base Wallet Library
    // const BaseWalletWrapper = await BaseWallet.new();
    // console.log("Deployed BaseWallet at ", BaseWalletWrapper.address);
    // // Deploy the Wallet Factory
    // const WalletFactoryWrapper = await Factory.new(
    //     BaseWalletWrapper.address, GuardianStorageWrapper.address, accounts[10]);
    // console.log("Deployed WalletFactory at ", WalletFactoryWrapper.address);
    // // Deploy ArgentWalletDetector contract
    // const WalletDetectorWrapper = await WalletDetector.new([], []);
    // console.log("Deployed WalletDetector at ", WalletDetectorWrapper.address);
}

module.exports = function (callback) {
    main().then(() => callback()).catch((err) => callback(err));
  };