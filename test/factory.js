const { ethers } = require("hardhat");

// const ethers = require("ethers");
const { expect, util } = require("chai");

const utils = require("../utils/utilities.js");
const { ETH_TOKEN } = require("../utils/utilities.js");

const ZERO_ADDRESS = ethers.constants.AddressZero;
const ZERO_BYTES = "0x";

const SECURITY_PERIOD = 2;
const SECURITY_WINDOW = 2;
const LOCK_PERIOD = 4;
const RECOVERY_PERIOD = 4;

describe("Factory", async function () {
  async function signRefund(wallet, amount, token, signer) {
    const message = `0x${[wallet, ethers.utils.hexZeroPad(ethers.utils.hexlify(amount), 32), token]
      .map((hex) => hex.slice(2))
      .join("")}`;
    const sig = await utils.signMessage(ethers.utils.keccak256(message), signer);
    return sig;
  }
  async function deployGuardianStorage() {
    const guardianStorageContract = await ethers.getContractFactory("GuardianStorage");
    const guardianStorage = await guardianStorageContract.deploy();
    return guardianStorage;
  }
  async function deployFactoryFixture(guardianStorage) {
    const baseWalletContract = await ethers.getContractFactory("BaseWallet");
    const baseWallet = await baseWalletContract.deploy();

    const signers = await ethers.getSigners();
    const factoryContract = await ethers.getContractFactory("Factory");
    const factory = await factoryContract.deploy(baseWallet.address, guardianStorage.address, signers[0].address);
    await factory.deployed();
    return factory;
  }
  async function deployWalletModule(guardianStorage) {
    const moduleRegistryContract = await ethers.getContractFactory("ModuleRegistry");
    const moduleRegistry = await moduleRegistryContract.deploy();

    const authoriserContract = await ethers.getContractFactory("Authoriser");
    const authoriser = await authoriserContract.deploy(0);

    const dummyUniV2RouterContract = await ethers.getContractFactory("DummyUniV2Router");
    const dummyUniV2Router = await dummyUniV2RouterContract.deploy();

    const transferStorageContract = await ethers.getContractFactory("TransferStorage");
    const transferStorage = await transferStorageContract.deploy();

    const walletModuleContract = await ethers.getContractFactory("WalletModule");
    const walletModule = await walletModuleContract.deploy(
        moduleRegistry.address,
        guardianStorage.address,
        transferStorage.address,
        authoriser.address,
        dummyUniV2Router.address,
        SECURITY_PERIOD,
        SECURITY_WINDOW,
        LOCK_PERIOD,
        RECOVERY_PERIOD);
    return walletModule;
  }
  describe("test Factory", async function () {
    describe("factory", () => {
      it("create wallet", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const accounts = await ethers.getSigners();
        const manager = accounts[0].address;
        const owner = accounts[1].address;
        await factory.addManager(manager);
        const salt = utils.generateSaltValue();
        console.log("salt: ", salt);
        const futureAddr = await factory.getAddressForCounterfactualWallet(owner, modules, salt);
        console.log("futureAddr:", futureAddr);
        const ownerSig = await signRefund(futureAddr, 2, ETH_TOKEN, owner);
        console.log("ownerSig : ", ownerSig);
        const managerSig = await signRefund(futureAddr, 2, ETH_TOKEN, manager);
        console.log("managerSig : ", managerSig);
        const tx = await factory.createCounterfactualWallet(
          owner,
          modules,
          salt,
          0,
          ZERO_ADDRESS,
          ownerSig,
          managerSig,
        );
        console.log(tx);
        // const event = await utils.getEvent(tx.receipt, factory, "WalletCreated");
        // const walletAddr = event.args.wallet;
      });
    });
  });
});
