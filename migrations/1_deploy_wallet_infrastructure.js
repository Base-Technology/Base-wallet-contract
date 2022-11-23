global.web3 = web3;
global.artifacts = artifacts;

const ethers = require("ethers");

const GuardianStorage = artifacts.require("GuardianStorage");
const TransferStorage = artifacts.require("TransferStorage");
const BaseWallet = artifacts.require("BaseWallet");
const ModuleRegistry = artifacts.require("ModuleRegistry");
const WalletDetector = artifacts.require("WalletDetector");
const Authoriser = artifacts.require("Authoriser");
const DummyUniV2Router = artifacts.require("DummyUniV2Router");
const Factory = artifacts.require("Factory");
const Proxy = artifacts.require("Proxy");
const WalletModule = artifacts.require('WalletModule');

// const utils = require("../utils/utilities.js");

const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;

module.exports = async function(deployer,network,accounts) {
    // deployment steps
    await deployer.deploy(GuardianStorage);
    await deployer.deploy(TransferStorage);
    await deployer.deploy(WalletDetector,[],[]);
    await deployer.deploy(BaseWallet);
    await deployer.deploy(ModuleRegistry);
    await deployer.deploy(Authoriser,0);
    await deployer.deploy(DummyUniV2Router);
    await deployer.deploy(Factory,BaseWallet.address, GuardianStorage.address, accounts[0]);
    await deployer.deploy(Proxy,BaseWallet.address);
    await deployer.deploy(WalletModule,ModuleRegistry.address,GuardianStorage.address, TransferStorage.address, Authoriser.address, DummyUniV2Router.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);
  };