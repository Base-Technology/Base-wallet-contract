const { ethers } = require("hardhat");

// const ethers = require("ethers");
const { expect, util } = require("chai");
const { config } = require("hardhat")
const utils = require("../utils/utilities.js");
const { ETH_TOKEN } = require("../utils/utilities.js");

const ZERO_ADDRESS = ethers.constants.AddressZero;
const ZERO_BYTES = "0x";

const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;
const accounts = config.networks.hardhat.accounts;

describe("lock/unlock", async function () {
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
    async function deployGuardianStorage() {
        const guardianStorageContract = await ethers.getContractFactory("GuardianStorage");
        const guardianStorage = await guardianStorageContract.deploy();
        return guardianStorage;
    }
    describe("test lock/unlock", () => {
        it("lock wallet by nonguardian", async () => {
            const guardianStorage = await deployGuardianStorage()
            const walletModule = await deployWalletModule(guardianStorage)
            let baseWallet = await deployBaseWallet()
            const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
            const modules = [walletModule.address]

            await baseWallet.init(owner_1.address, modules)

            const guardian = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
            await guardianStorage.addGuardian(baseWallet.address, guardian.address);

            await expect(walletModule.lock(baseWallet.address)).to.be.revertedWith("Error:must be guardian/self")
            let isLock = await walletModule.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(false)
            await expect(walletModule.lock(baseWallet.address)).to.be.revertedWith("Error:must be guardian/self");
            isLock = await walletModule.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(false)
        });
        it("lock wallet when is lock", async () => {
            const guardianStorage = await deployGuardianStorage()
            const walletModule = await deployWalletModule(guardianStorage)
            let baseWallet = await deployBaseWallet()
            const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
            const modules = [walletModule.address]

            await baseWallet.init(owner_1.address, modules)

            const guardian = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
            await guardianStorage.addGuardian(baseWallet.address, guardian.address);

            await walletModule.lock(baseWallet.address)
            let isLock = await walletModule.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(true)
            isLock = await guardianStorage.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(false)
            await expect(walletModule.lock(baseWallet.address)).to.be.revertedWith("Error:wallet is lock")
        })
        it("unlock without lock", async () => {
            const guardianStorage = await deployGuardianStorage()
            const walletModule = await deployWalletModule(guardianStorage)
            let baseWallet = await deployBaseWallet()
            const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
            const modules = [walletModule.address]

            await baseWallet.init(owner_1.address, modules)

            const guardian = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
            await guardianStorage.addGuardian(baseWallet.address, guardian.address);

            await expect(walletModule.unlock(baseWallet.address)).to.be.revertedWith("Error:wallet is unlock")
        })
        it("lock and unlock", async () => {
            const guardianStorage = await deployGuardianStorage()
            const walletModule = await deployWalletModule(guardianStorage)
            let baseWallet = await deployBaseWallet()
            const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
            const modules = [walletModule.address]

            await baseWallet.init(owner_1.address, modules)

            const guardian = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
            const Signers = await ethers.getSigners()
            const guardian2 = Signers[2]
            await guardianStorage.addGuardian(baseWallet.address, guardian.address);
            await guardianStorage.addGuardian(baseWallet.address, guardian2.address);

            await walletModule.lock(baseWallet.address)
            let isLock = await walletModule.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(true)
            isLock = await guardianStorage.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(false)
            let releasetime = await walletModule.getLock(baseWallet.address)
            releasetime = releasetime.toNumber()
            await expect(releasetime).above(0)
            await walletModule.unlock(baseWallet.address)
            isLock = await walletModule.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(false)
            releasetime = await walletModule.getLock(baseWallet.address)
            releasetime = releasetime.toNumber()
            await expect(releasetime).to.be.equal(0)

            await walletModule.lock(baseWallet.address)
            isLock = await walletModule.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(true)
            isLock = await guardianStorage.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(false)
            releasetime = await walletModule.getLock(baseWallet.address)
            releasetime = releasetime.toNumber()
            await expect(releasetime).above(0)
            await walletModule.connect(guardian2).unlock(baseWallet.address)
            isLock = await walletModule.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(false)
            releasetime = await walletModule.getLock(baseWallet.address)
            releasetime = releasetime.toNumber()
            await expect(releasetime).to.be.equal(0)
        })
        it("auto-unlock after lock period", async () => {
            const guardianStorage = await deployGuardianStorage()
            const walletModule = await deployWalletModule(guardianStorage)
            let baseWallet = await deployBaseWallet()
            const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
            const modules = [walletModule.address]

            await baseWallet.init(owner_1.address, modules)

            const guardian = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
            await guardianStorage.addGuardian(baseWallet.address, guardian.address);

            await walletModule.lock(baseWallet.address)
            let isLock = await walletModule.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(true)
            isLock = await guardianStorage.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(false)
            let releasetime = await walletModule.getLock(baseWallet.address)
            releasetime = releasetime.toNumber()
            await expect(releasetime).above(0)

            await utils.increaseTime(130)

            isLock = await walletModule.isLocked(baseWallet.address)
            await expect(isLock).to.be.equal(false)

            releasetime = await walletModule.getLock(baseWallet.address)
            releasetime = releasetime.toNumber()
            await expect(releasetime).to.be.equal(0)
        })
    });

});