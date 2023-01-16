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

describe("Guardian", async function () {
    async function deployGuardianStorage() {
        const guardianStorageContract = await ethers.getContractFactory("GuardianStorage");
        const guardianStorage = await guardianStorageContract.deploy();
        return guardianStorage;
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
    describe("test Guardian", async function () {
        describe("test GuardianStorage", () => {
            it("add guardian", async () => {
                const guardianStorage = await deployGuardianStorage()
                const baseWallet = await deployBaseWallet()
                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian_2 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardian_3 = web3.eth.accounts.privateKeyToAccount(accounts[5].privateKey)
                await guardianStorage.addGuardian(baseWallet.address, guardian_1.address);
                await guardianStorage.addGuardian(baseWallet.address, guardian_2.address);
                await guardianStorage.addGuardian(baseWallet.address, guardian_3.address);
                const isGuardian1 = await guardianStorage.isGuardian(baseWallet.address, guardian_1.address);
                const isGuardian2 = await guardianStorage.isGuardian(baseWallet.address, guardian_2.address);
                const isGuardian3 = await guardianStorage.isGuardian(baseWallet.address, guardian_3.address);
                await expect(isGuardian1).to.equal(true)
                await expect(isGuardian2).to.equal(true)
                await expect(isGuardian3).to.equal(true)
                console.log("guardian of wallet")
                console.log(await guardianStorage.getGuardians(baseWallet.address))
                let wallet1GuardianCount = await guardianStorage.guardianCount(baseWallet.address)
                wallet1GuardianCount = wallet1GuardianCount.toNumber()
                await expect(wallet1GuardianCount).to.equal(3)
            })
            it("delete guardian", async () => {
                const guardianStorage = await deployGuardianStorage()
                const baseWallet = await deployBaseWallet()
                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian_2 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardian_3 = web3.eth.accounts.privateKeyToAccount(accounts[5].privateKey)
                await guardianStorage.addGuardian(baseWallet.address, guardian_1.address);
                await guardianStorage.addGuardian(baseWallet.address, guardian_2.address);
                await guardianStorage.addGuardian(baseWallet.address, guardian_3.address);
                let isGuardian1 = await guardianStorage.isGuardian(baseWallet.address, guardian_1.address);
                let isGuardian2 = await guardianStorage.isGuardian(baseWallet.address, guardian_2.address);
                let isGuardian3 = await guardianStorage.isGuardian(baseWallet.address, guardian_3.address);
                await expect(isGuardian1).to.equal(true)
                await expect(isGuardian2).to.equal(true)
                await expect(isGuardian3).to.equal(true)

                console.log("guardian of wallet before delete")
                console.log(await guardianStorage.getGuardians(baseWallet.address))
                let wallet1GuardianCount = await guardianStorage.guardianCount(baseWallet.address)
                wallet1GuardianCount = wallet1GuardianCount.toNumber()
                await expect(wallet1GuardianCount).to.equal(3)

                await guardianStorage.revokeGuardian(baseWallet.address, guardian_1.address);
                await guardianStorage.revokeGuardian(baseWallet.address, guardian_2.address);
                await guardianStorage.revokeGuardian(baseWallet.address, guardian_3.address);
                isGuardian1 = await guardianStorage.isGuardian(baseWallet.address, guardian_1.address);
                isGuardian2 = await guardianStorage.isGuardian(baseWallet.address, guardian_2.address);
                isGuardian3 = await guardianStorage.isGuardian(baseWallet.address, guardian_3.address);
                await expect(isGuardian1).to.equal(false)
                await expect(isGuardian2).to.equal(false)
                await expect(isGuardian3).to.equal(false)

                console.log("guardian of wallet after delete")
                console.log(await guardianStorage.getGuardians(baseWallet.address))
                wallet1GuardianCount = await guardianStorage.guardianCount(baseWallet.address)
                wallet1GuardianCount = wallet1GuardianCount.toNumber()
                await expect(wallet1GuardianCount).to.equal(0)
            })
        })

        describe("add guardian", () => {
            it("add owner to guardian", async () => {
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner_2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const owner_3 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                const baseWallet = await deployBaseWallet()
                const modules = [walletModule.address]
                await baseWallet.init(owner_1.address, modules)
                await baseWallet.addOwner(owner_2.address)
                await baseWallet.addOwner(owner_3.address)
                await expect(walletModule.addGuardian(baseWallet.address, owner_1.address)).to.revertedWith("Error: owner can not be a guardian")
                await expect(walletModule.addGuardian(baseWallet.address, owner_2.address)).to.revertedWith("Error: owner can not be a guardian")
                await expect(walletModule.addGuardian(baseWallet.address, owner_3.address)).to.revertedWith("Error: owner can not be a guardian")
            })
            it("nonowner add guardian", async () => {
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                const baseWallet = await deployBaseWallet()
                const modules = [walletModule.address]
                await baseWallet.init(owner_1.address, modules)
                await expect(walletModule.addGuardian(baseWallet.address, guardian_1.address)).to.revertedWith("Error:must be owner/self")
                await expect(walletModule.addGuardian(baseWallet.address, guardian_1.address)).to.revertedWith("Error:must be owner/self")
            })
            it("let owner add guardain", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const Signers = await ethers.getSigners()
                const owner_2 = Signers[1]
                const owner_3 = Signers[2]

                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)
                await baseWallet.addOwner(owner_2.address)
                console.log("owner2", owner_2.address)
                await baseWallet.addOwner(owner_3.address)
                console.log("owner3", owner_3.address)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian_2 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardian_3 = web3.eth.accounts.privateKeyToAccount(accounts[5].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address)
                let isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await utils.increaseTime(30);
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true)

                await walletModule.connect(owner_2).addGuardian(baseWallet.address, guardian_2.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_2.address);
                await expect(isGuardian).to.be.equal(false)
                await utils.increaseTime(30);
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_2.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_2.address);
                await expect(isGuardian).to.be.equal(true)

                await walletModule.connect(owner_3).addGuardian(baseWallet.address, guardian_3.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_3.address);
                await expect(isGuardian).to.be.equal(false)
                await utils.increaseTime(30);
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_3.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_3.address);
                await expect(isGuardian).to.be.equal(true)

                let guardains = await walletModule.getGuardians(baseWallet.address);
                console.log(guardains)
            })
            it("confirm too early", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address);
                let isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await expect(walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error: pending addition not over")
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
            })
            it("confirm after time out", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address);
                await utils.increaseTime(50);
                let isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await expect(walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address)).to.be.revertedWith("pending addition expired")
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address)
                await expect(isGuardian).to.be.equal(false)
            })
            it("add guardian again after time out", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address);
                await utils.increaseTime(50);
                let isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)

                await expect(walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address)).to.be.revertedWith("pending addition expired")
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)

                // add again
                await walletModule.addGuardian(baseWallet.address, guardian_1.address);
                await utils.increaseTime(30);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true)
            })
            it("add repeated guardian", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address);
                await utils.increaseTime(30);
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address);
                await expect(walletModule.addGuardian(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error:is already a guardian")
            })
            it("make repeated addition request", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address);
                await expect(walletModule.addGuardian(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error:duplicate pending addition");
            })
            it("add wallet to guardian", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner_2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const walletAddr = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey).address
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const baseWalletContract = await ethers.getContractFactory("BaseWallet");
                const wallet_2 = await baseWalletContract.attach(walletAddr);
                await wallet_2.init(owner_2.address, modules)

                await walletModule.addGuardian(baseWallet.address, wallet_2.address);
                let isGuardian = await walletModule.isGuardian(baseWallet.address, wallet_2.address);
                await expect(isGuardian).to.be.equal(false)
                utils.evmIncreaseTime(30)
                await walletModule.confirmGuardianAddition(baseWallet.address, wallet_2.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, wallet_2.address);
                await expect(isGuardian).to.be.equal(true)
            })
            it("add not EOA/wallet", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                await expect(walletModule.addGuardian(baseWallet.address, walletModule.address)).to.be.revertedWith("Error:must be EOA/ wallet");
            })
            it("cancle addition", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address);
                let isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await walletModule.cancelGuardianAddition(baseWallet.address, guardian_1.address)
                await expect(walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error: no pending addition")
            })
        })

        describe("Revoke Guardian", () => {
            it("revoke guardian", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address)
                let isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await utils.increaseTime(30);
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true)

                await walletModule.revokeGuardian(baseWallet.address, guardian_1.address)
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true);
                utils.increaseTime(30)

                await walletModule.confirmGuardianRevokation(baseWallet.address, guardian_1.address)
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false);
            })

            it("revoke a nonexistent guardian", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await expect(walletModule.revokeGuardian(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error:is not a guardian")
            })
            it("nonowner revoke guardian", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const modules = [walletModule.address]
                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await baseWallet.init(owner_1.address, modules)

                await expect(walletModule.addGuardian(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error:must be owner/self")
            })
            it("confirm revokation too early", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address)
                let isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await utils.increaseTime(30);
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true)

                await walletModule.revokeGuardian(baseWallet.address, guardian_1.address)
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true);
                await expect(walletModule.confirmGuardianRevokation(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error: pending revokation not over")
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true);
            })
            it("confirm revokation aftar timeout", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address)
                let isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await utils.increaseTime(30);
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true)

                await walletModule.revokeGuardian(baseWallet.address, guardian_1.address)
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true);
                utils.increaseTime(50)
                await expect(walletModule.confirmGuardianRevokation(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error:pending revokation expired")
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true);
            })
            it("add guardian after revoke", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address)
                let isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await utils.increaseTime(30);
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true)

                await walletModule.revokeGuardian(baseWallet.address, guardian_1.address)
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true);
                utils.increaseTime(30)
                await walletModule.confirmGuardianRevokation(baseWallet.address, guardian_1.address)
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false);

                await walletModule.addGuardian(baseWallet.address, guardian_1.address)
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await utils.increaseTime(30);
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true)
            })
            it("make repeated revokation request", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address)
                let isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await utils.increaseTime(30);
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true)

                await walletModule.revokeGuardian(baseWallet.address, guardian_1.address)
                await expect(walletModule.revokeGuardian(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error:duplicate pending revoketion")
            })
            it("cancel recokation", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address)
                let isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(false)
                await utils.increaseTime(30);
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address);
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true)

                await walletModule.revokeGuardian(baseWallet.address, guardian_1.address)
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true);
                await walletModule.cancelGuardianRevokation(baseWallet.address, guardian_1.address)
                await expect(walletModule.confirmGuardianRevokation(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error: no pending revokation")
                isGuardian = await walletModule.isGuardian(baseWallet.address, guardian_1.address);
                await expect(isGuardian).to.be.equal(true);
            })

        })

        describe("incorrect cancle request", () => {
            it("cancle nonexistent addition / revokation", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await expect(walletModule.cancelGuardianRevokation(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error: no pending revokation")
                await expect(walletModule.cancelGuardianAddition(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error:no pending addition")
            })
            it("nonowner cancle addition", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address)
                const Signers = await ethers.getSigners()
                const newSender = Signers[1]
                await expect(walletModule.connect(newSender).cancelGuardianAddition(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error:must be owner/self")
            })
            it("nonowner cancle revokation", async () => {
                const guardianStorage = await deployGuardianStorage()
                const walletModule = await deployWalletModule(guardianStorage)
                let baseWallet = await deployBaseWallet()
                const owner_1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const modules = [walletModule.address]

                await baseWallet.init(owner_1.address, modules)

                const guardian_1 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)

                await walletModule.addGuardian(baseWallet.address, guardian_1.address)
                utils.evmIncreaseTime(30)
                await walletModule.confirmGuardianAddition(baseWallet.address, guardian_1.address)
                await walletModule.revokeGuardian(baseWallet.address, guardian_1.address)
                const Signers = await ethers.getSigners()
                const newSender = Signers[1]

                await expect(walletModule.connect(newSender).cancelGuardianRevokation(baseWallet.address, guardian_1.address)).to.be.revertedWith("Error:must be owner/self")

            })
        })
    });
});