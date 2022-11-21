global.web3 = web3;
global.artifacts = artifacts;

const ethers = require("ethers");

const GuardianStorage = artifacts.require("GuardianStorage");
const TransferStorage = artifacts.require("TransferStorage");
const Proxy = artifacts.require("Proxy");
const BaseWallet = artifacts.require("BaseWallet");
const WalletModule = artifacts.require('WalletModule');
const ModuleRegistry = artifacts.require("ModuleRegistry");
const Factory = artifacts.require("Factory");
const WalletDetector = artifacts.require("WalletDetector");
const Authoriser = artifacts.require("Authoriser");
const DummyUniV2Router = artifacts.require("DummyUniV2Router");


// const utils = require("../utils/utilities.js");
const deployManager = require("../utils/deploy-manager.js");

const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;

module.exports = function(deployer,network,accounts) {
    // deployment steps
    deployer.deploy(GuardianStorage);
    deployer.deploy(TransferStorage);
    deployer.deploy(WalletDetector,[],[]);
    deployer.deploy(BaseWallet);
    deployer.deploy(Factory,BaseWallet.address, GuardianStorage.address, accounts[0]);
    deployer.deploy(Proxy,BaseWallet.address);
    deployer.deploy(ModuleRegistry);
    deployer.deploy(Authoriser,0);
    deployer.deploy(DummyUniV2Router);
    deployer.deploy(WalletModule,ModuleRegistry.address,GuardianStorage.address, TransferStorage.address, Authoriser.address, DummyUniV2Router.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);
  };