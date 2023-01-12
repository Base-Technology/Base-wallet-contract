const { ethers } = require("hardhat");

// const ethers = require("ethers");
const { expect, util } = require("chai");
const { config } = require("hardhat")
const utils = require("../utils/utilities.js");
const { ETH_TOKEN } = require("../utils/utilities.js");

const ZERO_ADDRESS = ethers.constants.AddressZero;
const ZERO_BYTES = "0x";

const SECURITY_PERIOD = 2;
const SECURITY_WINDOW = 2;
const LOCK_PERIOD = 4;
const RECOVERY_PERIOD = 4;
const accounts = config.networks.hardhat.accounts;

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
  async function deployBaseWallet() {
    const baseWalletContract = await ethers.getContractFactory("BaseWallet");
    const baseWallet = await baseWalletContract.deploy();
    return baseWallet
  }
  async function cretaeWallet(factory, modules, manager, owner, refundAmount, refundAddress) {
    await factory.addManager(manager.address);
    const salt = utils.generateSaltValue();
    const futureAddr = await factory.getAddressForCounterfactualWallet(owner.address, modules, salt);
    const ownerSig = await signRefund(futureAddr, refundAmount, refundAddress, owner.address);
    const msg = ethers.utils.hexZeroPad(futureAddr, 32);
    const managerSig = await utils.signMessage(msg, manager.address);

    await web3.eth.sendTransaction({ from: owner.address, to: futureAddr, value: refundAmount });

    const tx = await factory.createCounterfactualWallet(
      owner.address,
      modules,
      salt,
      refundAmount,
      ZERO_ADDRESS,
      ownerSig,
      managerSig,
    );
    const baseWalletContract = await ethers.getContractFactory("BaseWallet");
    const wallet = await baseWalletContract.attach(futureAddr);
    const isOwner = await wallet.isOwner(owner.address)
    expect(isOwner).to.equal(true)
    const isAuthorised = await wallet.authorised(modules[0]);
    expect(isAuthorised).to.equal(true)

    const count = await wallet.modules()
    expect(count).to.equal(1)
    // console.log("tx.receipt : ",tx.receipt);
    //       const event = await utils.getEvent(tx.receipt, factory, "WalletCreated");
    //       const walletAddr = event.args.wallet;
    //       console.log(walletAddr)
  }

  describe("test Factory", async function () {
    describe("create factory", () => {
      it("create with empty WalletImplementation", async () => {
        const guardianStorage = await deployGuardianStorage();
        const baseWallet = await deployBaseWallet();
        const factoryContract = await ethers.getContractFactory("Factory");
        const refundAddress = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
        await expect(factoryContract.deploy(ZERO_ADDRESS, guardianStorage.address, refundAddress.address)).to.be.revertedWith("WF: empty wallet implementation")
      })
      it("create with empty GuardianStorage", async () => {
        const guardianStorage = await deployGuardianStorage();
        const baseWallet = await deployBaseWallet();
        const factoryContract = await ethers.getContractFactory("Factory");
        const refundAddress = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
        await expect(factoryContract.deploy(baseWallet.address, ZERO_ADDRESS, refundAddress.address)).to.be.revertedWith("WF: empty guardian storage")
      })
      it("create with empty RefundAddress", async () => {
        const guardianStorage = await deployGuardianStorage();
        const baseWallet = await deployBaseWallet();
        const factoryContract = await ethers.getContractFactory("Factory");
        const refundAddress = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
        await expect(factoryContract.deploy(baseWallet.address, guardianStorage.address, ZERO_ADDRESS)).to.be.revertedWith("WF: empty refund address")
      })
    })
    describe("change refund address", () => {
      it("change refund address", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const refundAddress1 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
        await factory.changeRefundAddress(refundAddress1.address);
        const updatedRefundAddress = await factory.refundAddress();
        console.log(updatedRefundAddress)
        // await expect(factory.refundAddress()).to.equal(refundAddress1)
        await expect(updatedRefundAddress).to.equal(refundAddress1.address)
      })
      it("change refund address to zero address", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        await expect(factory.changeRefundAddress(ZERO_ADDRESS)).to.be.revertedWith("WF: cannot set to empty")
      })
      it("non-owner change refund address", async () => {
        const guardianStorage = await deployGuardianStorage();
        let factory = await deployFactoryFixture(guardianStorage);
        const refundAddress1 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
        const Signers = await ethers.getSigners()
        const newSender = Signers[1]
        await expect(factory.connect(newSender).changeRefundAddress(refundAddress1.address)).to.be.revertedWith("Must be owner")
      })
    })
    describe("test create wallet", () => {
      it("refundAmount = 0", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];

        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)

        await cretaeWallet(factory, modules, manager, owner, 0, ETH_TOKEN)
      });
      it("refundAmount = 1000", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
        await cretaeWallet(factory, modules, manager, owner, 1000, ETH_TOKEN)

      });
      it("refundAmount = 1", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
        await cretaeWallet(factory, modules, manager, owner, 1, ETH_TOKEN)
      });
      it("refundAmount = 2", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
        await cretaeWallet(factory, modules, manager, owner, 2, ETH_TOKEN)
      });
      it("when an invalid refund amount is provided", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const refundAmount = 1000;

        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)

        await factory.addManager(manager.address);
        const salt = utils.generateSaltValue();
        const futureAddr = await factory.getAddressForCounterfactualWallet(owner.address, modules, salt);
        const ownerSig = await signRefund(futureAddr, refundAmount, ETH_TOKEN, owner.address);
        const msg = ethers.utils.hexZeroPad(futureAddr, 32);
        const managerSig = await utils.signMessage(msg, manager.address);

        await web3.eth.sendTransaction({ from: owner.address, to: futureAddr, value: refundAmount });

        const tx = await factory.createCounterfactualWallet(
          owner.address,
          modules,
          salt,
          2 * refundAmount,
          ETH_TOKEN,
          ownerSig,
          managerSig,
        );
        const baseWalletContract = await ethers.getContractFactory("BaseWallet");
        const wallet = await baseWalletContract.attach(futureAddr);
        const isOwner = await wallet.isOwner(owner.address)
        expect(isOwner).to.equal(true)
        const isAuthorised = await wallet.authorised(modules[0]);
        expect(isAuthorised).to.equal(true)

        const count = await wallet.modules()
        expect(count).to.equal(1)
      });
      it("in ERC20 token when a valid signature is provided", async () => {
        const factoryOwner = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
        const salt = utils.generateSaltValue();

        const ERC20 = await ethers.getContractFactory("TestERC20");
        const futureAddr = await factory.getAddressForCounterfactualWallet(owner.address, modules, salt);
        const token = await ERC20.deploy([factoryOwner.address, futureAddr], 10000000, 12);
        const refundAmount = 1000;

        await factory.addManager(manager.address);
        const ownerSig = await signRefund(futureAddr, refundAmount, token.address, owner.address);
        const msg = ethers.utils.hexZeroPad(futureAddr, 32);
        const managerSig = await utils.signMessage(msg, manager.address);
        const tx = await factory.createCounterfactualWallet(
          owner.address,
          modules,
          salt,
          refundAmount,
          token.address,
          ownerSig,
          managerSig,
        );
        const baseWalletContract = await ethers.getContractFactory("BaseWallet");
        const wallet = await baseWalletContract.attach(futureAddr);
        const isOwner = await wallet.isOwner(owner.address)
        expect(isOwner).to.equal(true)
        const isAuthorised = await wallet.authorised(modules[0]);
        expect(isAuthorised).to.equal(true)

        const count = await wallet.modules()
        expect(count).to.equal(1)
      });
      it("when a replayed owner signature is provided", async () => {
        const refundAmount = 1000;
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)

        const salt1 = utils.generateSaltValue();
        const futureAddr1 = await factory.getAddressForCounterfactualWallet(owner.address, modules, salt1);
        const ownerSig = await signRefund(futureAddr1, refundAmount, ETH_TOKEN, owner.address);

        const salt2 = utils.generateSaltValue();
        const futureAddr2 = await factory.getAddressForCounterfactualWallet(owner.address, modules, salt2);
        await web3.eth.sendTransaction({ from: owner.address, to: futureAddr2, value: refundAmount });

        const msg = ethers.utils.hexZeroPad(futureAddr2, 32);
        const managerSig = await utils.signMessage(msg, manager.address);

        await factory.addManager(manager.address);

        const tx2 = await factory.createCounterfactualWallet(
          owner.address, modules, salt2, refundAmount, ETH_TOKEN, ownerSig, managerSig);

        const baseWalletContract = await ethers.getContractFactory("BaseWallet");
        const wallet = await baseWalletContract.attach(futureAddr2);
        const isOwner = await wallet.isOwner(owner.address)
        expect(isOwner).to.equal(true)
        const isAuthorised = await wallet.authorised(modules[0]);
        expect(isAuthorised).to.equal(true)

        const count = await wallet.modules()
        expect(count).to.equal(1)
      });
      it("create a wallet at an existing address", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
        const refundAmount = 10

        await factory.addManager(manager.address);
        const salt = utils.generateSaltValue();
        const futureAddr = await factory.getAddressForCounterfactualWallet(owner.address, modules, salt);
        const ownerSig = await signRefund(futureAddr, refundAmount, ZERO_ADDRESS, owner.address);
        const msg = ethers.utils.hexZeroPad(futureAddr, 32);
        const managerSig = await utils.signMessage(msg, manager.address);

        await web3.eth.sendTransaction({ from: owner.address, to: futureAddr, value: refundAmount });

        const tx = await factory.createCounterfactualWallet(
          owner.address,
          modules,
          salt,
          refundAmount,
          ZERO_ADDRESS,
          ownerSig,
          managerSig,
        );

        const baseWalletContract = await ethers.getContractFactory("BaseWallet");
        const wallet = await baseWalletContract.attach(futureAddr);
        const isOwner = await wallet.isOwner(owner.address)
        expect(isOwner).to.equal(true)
        const isAuthorised = await wallet.authorised(modules[0]);
        expect(isAuthorised).to.equal(true)

        const count = await wallet.modules()
        expect(count).to.equal(1)

        await expect(factory.createCounterfactualWallet(
          owner.address,
          modules,
          salt,
          refundAmount,
          ZERO_ADDRESS,
          ownerSig,
          managerSig,
        )).to.be.revertedWith("")
      });
      it("when there is not enough for the refund", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
        const refundAmount = 1000

        await factory.addManager(manager.address);
        const salt = utils.generateSaltValue();
        const futureAddr = await factory.getAddressForCounterfactualWallet(owner.address, modules, salt);
        const ownerSig = await signRefund(futureAddr, refundAmount, ZERO_ADDRESS, owner.address);
        const msg = ethers.utils.hexZeroPad(futureAddr, 32);
        const managerSig = await utils.signMessage(msg, manager.address);

        await web3.eth.sendTransaction({ from: owner.address, to: futureAddr, value: 900 });

        await expect(factory.createCounterfactualWallet(
          owner.address,
          modules,
          salt,
          refundAmount,
          ZERO_ADDRESS,
          ownerSig,
          managerSig,
        )).to.be.revertedWith("")
      });
      it("should fail to create counterfactually when there are no modules (with guardian)", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
        const refundAmount = 1000

        await factory.addManager(manager.address);
        const salt = utils.generateSaltValue();
        const futureAddr = await factory.getAddressForCounterfactualWallet(owner.address, modules, salt);
        const ownerSig = await signRefund(futureAddr, refundAmount, ZERO_ADDRESS, owner.address);
        const msg = ethers.utils.hexZeroPad(futureAddr, 32);
        const managerSig = await utils.signMessage(msg, manager.address);

        await web3.eth.sendTransaction({ from: owner.address, to: futureAddr, value: refundAmount });

        await expect(
          factory.createCounterfactualWallet(
            owner.address, [ethers.constants.AddressZero], salt, 0, ZERO_ADDRESS, ownerSig, managerSig
          )).to.be.revertedWith("")
      });
      it("should fail to create when the owner is empty", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
        const refundAmount = 1000

        await factory.addManager(manager.address);
        const salt = utils.generateSaltValue();
        const futureAddr = await factory.getAddressForCounterfactualWallet(owner.address, modules, salt);
        const ownerSig = await signRefund(futureAddr, refundAmount, ZERO_ADDRESS, owner.address);
        const msg = ethers.utils.hexZeroPad(futureAddr, 32);
        const managerSig = await utils.signMessage(msg, manager.address);

        await web3.eth.sendTransaction({ from: owner.address, to: futureAddr, value: refundAmount });

        await expect(
          factory.createCounterfactualWallet(
            ZERO_ADDRESS, [ethers.constants.AddressZero], salt, 0, ZERO_ADDRESS, ownerSig, managerSig
          )).to.be.revertedWith("")
      });
      it("should fail to create by a non-manager without a manager's signature", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const module = await deployWalletModule(guardianStorage);
        const modules = [module.address];
        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        const owner = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
        const refundAmount = 1000

        await factory.addManager(manager.address);
        const salt = utils.generateSaltValue();
        const futureAddr = await factory.getAddressForCounterfactualWallet(owner.address, modules, salt);
        const ownerSig = await signRefund(futureAddr, refundAmount, ZERO_ADDRESS, owner.address);

        await web3.eth.sendTransaction({ from: owner.address, to: futureAddr, value: refundAmount });

        await expect(
          factory.createCounterfactualWallet(
            owner.address, modules, salt, 0, ZERO_ADDRESS, ownerSig, "0x"
          )).to.be.revertedWith("WF: unauthorised wallet creation")
      });
    });
    describe("Managed-like contract logic", () => {
      it("should not be able to revoke a manager", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const manager = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
        await factory.addManager(manager.address);
        await expect(factory.revokeManager(manager.address)).to.be.revertedWith("WF: Manager can not REVOKE in WF");
      });

      it("should not be able to add manager if not called by owner", async () => {
        const guardianStorage = await deployGuardianStorage();
        let factory = await deployFactoryFixture(guardianStorage);
        const Signers = await ethers.getSigners()
        const newSender = Signers[1]

        console.log("newSender address", newSender.address)
        await expect(factory.connect(newSender).addManager(newSender.address)).to.be.revertedWith("owned: Must be owner");
      });

      it("should not be able to set manager to zero address", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        await expect(factory.addManager(ethers.constants.AddressZero)).to.be.revertedWith("manager address must not be null");
      });

      it("should be able to set manager twice without error", async () => {
        const guardianStorage = await deployGuardianStorage();
        const factory = await deployFactoryFixture(guardianStorage);
        const other = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)

        await factory.addManager(other.address);
        let isManager = await factory.managers(other.address);
        await expect(isManager).to.equal(true);

        await factory.addManager(other.address);
        isManager = await factory.managers(other.address);
        await expect(isManager).to.equal(true);
      });
    });
  });
});
