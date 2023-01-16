const { ethers } = require("hardhat");

// const ethers = require("ethers");
const { expect, util } = require("chai");
const { config } = require("hardhat")
const utils = require("../utils/utilities.js");
const { ETH_TOKEN } = require("../utils/utilities.js");
const RelayManager = require("../utils/relay-manager.js");
const BN = require("bn.js");

const WalletModule = artifacts.require('WalletModule');
const Proxy = artifacts.require("Proxy");

const ZERO_ADDRESS = ethers.constants.AddressZero;
const ZERO_BYTES = "0x";

const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;
const accounts = config.networks.hardhat.accounts;

const WRONG_SIGNATURE_NUMBER_REVERT_MSG = "Wrong number of signatures";
const INVALID_SIGNATURES_REVERT_MSG = "Error:Invalid signatures";

describe("recovery", async function () {
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

    async function addGuardians(guardianStorage, wallet, guardians) {
        for (const guardian of guardians) {
            await guardianStorage.addGuardian(wallet.address, guardian)
        }
    }
    async function beforeTest(owner1, owner2) {
        const guardianStorage = await deployGuardianStorage()
        const walletModule1 = await deployWalletModule(guardianStorage)
        const walletModule = await WalletModule.at(walletModule1.address)
        const wallet = await deployBaseWallet()
        const modules = [walletModule.address]

        const manager = new RelayManager(guardianStorage.address, ZERO_ADDRESS);

        await wallet.init(owner1.address, modules)

        let isOwner = await wallet.isOwner(owner1.address)
        await expect(isOwner).to.be.equal(true)
        isOwner = await wallet.isOwner(owner2.address)
        await expect(isOwner).to.be.equal(false)
        return { guardianStorage, walletModule, wallet, manager }
    }
    async function createSmartContractGuardians(walletModule, guardians) {
        const wallets = []
        for (let guardian of guardians) {
            const proxyContract = await ethers.getContractFactory("Proxy");
            const baseWalletContract = await ethers.getContractFactory("BaseWallet");
            const baseWallet = await baseWalletContract.deploy();
            const proxy = await proxyContract.attach(baseWallet.address)

            const guardianWallet = await baseWalletContract.attach(proxy.address);
            await guardianWallet.init(guardian, [walletModule.address])
            wallets.push(guardianWallet.address)
        }
        return wallets
    }

    async function recoveryWithMajorityGuardians(manager, walletModule, wallet, guardians, owner1, owner2) {
        const majority = guardians.slice(0, Math.ceil(guardians.length / 2))
        await manager.relay(walletModule, "executeRecovery", [wallet.address, owner2.address], wallet, utils.sortWalletByAddress(majority))

        const isLocked = await walletModule.isLocked(wallet.address)
        await expect(isLocked).to.be.equal(true)

        const recoveryConfig = await walletModule.getRecovery(wallet.address);
        expect(recoveryConfig._newOwner).to.be.equal(owner2.address)
        expect(recoveryConfig._guardianCount.toNumber()).to.be.equal(guardians.length);
        const recoveryPeriod = new BN(RECOVERY_PERIOD)
        const timestamp = await utils.getTimestamp()
        assert.closeTo(recoveryConfig._executeTime.toNumber(), recoveryPeriod.add(new BN(timestamp)).toNumber(), 1)

        isOwner = await walletModule.isOwner(wallet.address, owner1.address);
        expect(isOwner).to.be.equal(true)
        isOwner = await walletModule.isOwner(wallet.address, owner2.address);
        expect(isOwner).to.be.equal(false)
    }
    async function recoveryWithOwner(manager, walletModule, wallet, guardians, owner1, owner2) {
        const expectedRevertMsg = guardians.length >= 3 ? WRONG_SIGNATURE_NUMBER_REVERT_MSG : INVALID_SIGNATURES_REVERT_MSG;
        expect(
            manager.relay(
                walletModule,
                "executeRecovery",
                [wallet.address, owner2.address],
                wallet,
                [owner1.address],
            )).to.be.revertedWith(expectedRevertMsg);

        isOwner = await walletModule.isOwner(wallet.address, owner1.address);
        await expect(isOwner).to.be.equal(true)
        isOwner = await walletModule.isOwner(wallet.address, owner2.address);
        await expect(isOwner).to.be.equal(false)
    }
    async function recoveryWithMajorityGuardiansAndOwner(manager, walletModule, wallet, guardians, owner1, owner2) {
        const majority = guardians.slice(0, Math.ceil(guardians.length / 2) - 1)
        await expect(manager.relay(walletModule, "executeRecovery", [wallet.address, owner2.address], wallet, [owner1.address, ...utils.sortWalletByAddress(majority)])).to.be.revertedWith(INVALID_SIGNATURES_REVERT_MSG)
        const isLocked = await walletModule.isLocked(wallet.address)
        await expect(isLocked).to.be.equal(false)
    }
    async function recoveryWithMinorityGuardians(manager, walletModule, wallet, guardians, owner1, owner2) {
        const minority = guardians.slice(0, Math.ceil(guardians.length / 2) - 1)
        await expect(manager.relay(walletModule, "executeRecovery", [wallet.address, owner2.address], wallet, utils.sortWalletByAddress(minority))).to.be.revertedWith(WRONG_SIGNATURE_NUMBER_REVERT_MSG)

        const isLocked = await walletModule.isLocked(wallet.address)
        await expect(isLocked).to.be.equal(false)
    }
    async function recoveryWithMajorityGuardiansAndNonGuardian(manager, walletModule, wallet, guardians, nonguardian, owner2) {
        const majority = guardians.slice(0, Math.ceil(guardians.length / 2) - 1)
        await expect(manager.relay(walletModule, "executeRecovery", [wallet.address, owner2.address], wallet, [nonguardian.address, ...utils.sortWalletByAddress(majority)])).to.be.revertedWith(INVALID_SIGNATURES_REVERT_MSG)
        let isLocked = await walletModule.isLocked(wallet.address)
        await expect(isLocked).to.be.equal(false)

        await expect(manager.relay(walletModule, "executeRecovery", [wallet.address, owner2.address], wallet, [...utils.sortWalletByAddress(majority), nonguardian.address])).to.be.revertedWith(INVALID_SIGNATURES_REVERT_MSG)
        isLocked = await walletModule.isLocked(wallet.address)
        await expect(isLocked).to.be.equal(false)
    }
    async function CancelWith2Guardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2) {
        await manager.relay(walletModule, "cancelRecovery", [wallet.address], wallet, utils.sortWalletByAddress([guardian1.address, guardian2.address]));
        const isLocked = await walletModule.isLocked(wallet.address);
        await expect(isLocked).to.be.equal(false);
        await utils.increaseTime(40); // moving time to after the end of the recovery period
        const txReceipt = await manager.relay(walletModule, "finalizeRecovery", [wallet.address], wallet, []);
        const { success, error } = utils.parseRelayReceipt(txReceipt);
        await expect(success).to.be.equal(false)
        console.log(1)
        await expect(error).to.be.equal("Error:is no recovery");
        let isOwner = await walletModule.isOwner(wallet.address, owner1.address);
        await expect(isOwner).to.be.equal(true)
        isOwner = await walletModule.isOwner(wallet.address, owner2.address);
        await expect(isOwner).to.be.equal(false)

        const recoveryConfig = await walletModule.getRecovery(wallet.address);
        await expect(recoveryConfig._newOwner).to.be.equal(ethers.constants.AddressZero);
        await expect(recoveryConfig._executeTime.toNumber()).to.be.equal(0);
        await expect(recoveryConfig._guardianCount.toNumber()).to.be.equal(0);
    }
    async function CancelWithOwnerAndGuardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2) {
        await manager.relay(walletModule, "cancelRecovery", [wallet.address], wallet, [owner1.address, guardian1.address]);
        const isLocked = await walletModule.isLocked(wallet.address);
        await expect(isLocked).to.be.equal(false);
        await utils.increaseTime(40); // moving time to after the end of the recovery period
        const txReceipt = await manager.relay(walletModule, "finalizeRecovery", [wallet.address], wallet, []);
        const { success, error } = utils.parseRelayReceipt(txReceipt);
        await expect(success).to.be.equal(false)
        assert.equal(error, "Error:is no recovery");
        let isOwner = await walletModule.isOwner(wallet.address, owner1.address);
        await expect(isOwner).to.be.equal(true)
        isOwner = await walletModule.isOwner(wallet.address, owner2.address);
        await expect(isOwner).to.be.equal(false)
    }
    async function CancelWith1Guardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2) {
        await expect(
            manager.relay(
                walletModule,
                "cancelRecovery",
                [wallet.address],
                wallet,
                [guardian1.address],
            )).to.be.revertedWith(WRONG_SIGNATURE_NUMBER_REVERT_MSG)

        const isLocked = await walletModule.isLocked(wallet.address);
        await expect(isLocked).to.be.equal(true)
    }
    async function CancelWithOwner(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2) {
        await expect(
            manager.relay(
                walletModule,
                "cancelRecovery",
                [wallet.address],
                wallet,
                [owner1.address],
            )).to.be.revertedWith(WRONG_SIGNATURE_NUMBER_REVERT_MSG);

        const isLocked = await walletModule.isLocked(wallet.address);
        await expect(isLocked).to.be.equal(true)
    }
    async function CancelWithDuplicateGuardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2) {
        await expect(
            manager.relay(
                walletModule,
                "cancelRecovery",
                [wallet.address],
                wallet,
                [guardian1.address, guardian1.address],
            )).to.be.revertedWith(INVALID_SIGNATURES_REVERT_MSG);

        const isLocked = await walletModule.isLocked(wallet.address);
        await expect(isLocked).to.be.equal(true)
    }
    async function CancelWithNonGuardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2, nonguardian) {
        await expect(
            manager.relay(
                walletModule,
                "cancelRecovery",
                [wallet.address],
                wallet,
                utils.sortWalletByAddress([guardian1.address, nonguardian.address]),
            )).to.be.revertedWith(INVALID_SIGNATURES_REVERT_MSG);

        const isLocked = await walletModule.isLocked(wallet.address);
        await expect(isLocked).to.be.equal(true)
    }
    describe("Execute Recovery", () => {
        it("execute recovery with no guardians", async () => {
            const guardianStorage = await deployGuardianStorage()
            const walletModule1 = await deployWalletModule(guardianStorage)
            const walletModule = await WalletModule.at(walletModule1.address)
            let wallet = await deployBaseWallet()
            const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
            const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
            const modules = [walletModule.address]

            const manager = new RelayManager(guardianStorage.address, ZERO_ADDRESS);

            await wallet.init(owner1.address, modules)

            let isOwner = await wallet.isOwner(owner1.address)
            await expect(isOwner).to.be.equal(true)
            isOwner = await wallet.isOwner(owner2.address)
            await expect(isOwner).to.be.equal(false)

            await expect(manager.relay(walletModule, "executeRecovery", [wallet.address, owner2.address], wallet, [])).to.be.revertedWith("Error: no guardians on wallet")

            const isLocked = await walletModule.isLocked(wallet.address)
            await expect(isLocked).to.be.equal(false)

            isOwner = await wallet.isOwner(owner1.address)
            await expect(isOwner).to.be.equal(true)
            isOwner = await wallet.isOwner(owner2.address)
            await expect(isOwner).to.be.equal(false)
        });
        describe("execute with 2 guardians", () => {
            it("execute recovery with majority guardians", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardians = [guardian1.address, guardian2.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMajorityGuardians(manager, walletModule, wallet, guardians, owner1, owner2)
            })
            it("execute recovery with owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardians = [guardian1.address, guardian2.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithOwner(manager, walletModule, wallet, guardians, owner1, owner2)
            })
            it("execute with majority guardians + owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardians = [guardian1.address, guardian2.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMajorityGuardiansAndOwner(manager, walletModule, wallet, guardians, owner1, owner2)
            })
            it("execute with minority of guardians", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardians = [guardian1.address, guardian2.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMinorityGuardians(manager, walletModule, wallet, guardians, owner1, owner2)
            })
            it("majority guardians + non guardians signatures", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const nonguardian = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)

                const guardians = [guardian1.address, guardian2.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMajorityGuardiansAndNonGuardian(manager, walletModule, wallet, guardians, nonguardian, owner2)
            });
        })
        describe("execute with 3 guardians", () => {
            it("execute recovery with majority guardians", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMajorityGuardians(manager, walletModule, wallet, guardians, owner1, owner2)
            })
            it("execute recovery with owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithOwner(manager, walletModule, wallet, guardians, owner1, owner2)
            })
            it("execute with majority guardians + owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMajorityGuardiansAndOwner(manager, walletModule, wallet, guardians, owner1, owner2)
            })
            it("execute with minority of guardians", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMinorityGuardians(manager, walletModule, wallet, guardians, owner1, owner2)
            })
            it("majority guardians + non guardians signatures", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const nonguardian = web3.eth.accounts.privateKeyToAccount(accounts[5].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMajorityGuardiansAndNonGuardian(manager, walletModule, wallet, guardians, nonguardian, owner2)
            });
            it("execute recovery with duplicate guardian", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await expect(
                    manager.relay(
                        walletModule,
                        "executeRecovery",
                        [wallet.address, owner2.address],
                        wallet,
                        utils.sortWalletByAddress([guardian1.address, guardian1.address]),
                    )).to.be.revertedWith(INVALID_SIGNATURES_REVERT_MSG)
            })
        })
        describe('execute with 2 samart contrat guardians', () => {
            it("execute recovery with majority guardians", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address])
                await addGuardians(guardianStorage, wallet, guardians);
                await recoveryWithMajorityGuardians(manager, walletModule, wallet, [guardian1.address, guardian2.address], owner1, owner2)
            })
            it("execute recovery with owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address])
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithOwner(manager, walletModule, wallet, [guardian1.address, guardian2.address], owner1, owner2)
            })
            it("execute with majority guardians + owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address])
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMajorityGuardiansAndOwner(manager, walletModule, wallet, [guardian1.address, guardian2.address], owner1, owner2)
            })
            it("execute with minority of guardians", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address])
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMinorityGuardians(manager, walletModule, wallet, [guardian1.address, guardian2.address], owner1, owner2)
            })
            it("majority guardians + non guardians signatures", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const nonguardian = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)

                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address])
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMajorityGuardiansAndNonGuardian(manager, walletModule, wallet, [guardian1.address, guardian2.address], nonguardian, owner2)
            });
        })
        describe('execute with 3 samart contrat guardians', () => {
            it("execute recovery with majority guardians", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address, guardian3.address])
                await addGuardians(guardianStorage, wallet, guardians);
                await recoveryWithMajorityGuardians(manager, walletModule, wallet, [guardian1.address, guardian2.address, guardian3.address], owner1, owner2)
            })
            it("execute recovery with owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address, guardian3.address])
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithOwner(manager, walletModule, wallet, [guardian1.address, guardian2.address, guardian3.address], owner1, owner2)
            })
            it("execute with majority guardians + owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address, guardian3.address])
                await addGuardians(guardianStorage, wallet, guardians);


                await recoveryWithMajorityGuardiansAndOwner(manager, walletModule, wallet, [guardian1.address, guardian2.address, guardian3.address], owner1, owner2)
            })
            it("execute with minority of guardians", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address, guardian3.address])
                await addGuardians(guardianStorage, wallet, guardians);

                await recoveryWithMinorityGuardians(manager, walletModule, wallet, [guardian1.address, guardian2.address, guardian3.address], owner1, owner2)
            })
            it("majority guardians + non guardians signatures", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address, guardian3.address])
                await addGuardians(guardianStorage, wallet, guardians);
                const nonguardian = web3.eth.accounts.privateKeyToAccount(accounts[5].privateKey)

                await recoveryWithMajorityGuardiansAndNonGuardian(manager, walletModule, wallet, [guardian1.address, guardian2.address, guardian3.address], nonguardian, owner2)
            });
        })
        describe("Safety Checks", () => {
            it("execute with empty newOwner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, [guardian1.address]);
                const txReceipt = await manager.relay(walletModule, "executeRecovery", [wallet.address, ethers.constants.AddressZero], wallet, [guardian1.address]);
                const { success, error } = utils.parseRelayReceipt(txReceipt);
                await expect(success).to.be.equal(false)
                await expect(error).to.be.equal("Error:newOwner can not be address(0)");
            })
            it("execute when newOwner is guardian", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, [guardian1.address]);

                const txReceipt = await manager.relay(walletModule, "executeRecovery",
                    [wallet.address, guardian1.address], wallet, [guardian1.address]);
                const { success, error } = utils.parseRelayReceipt(txReceipt);
                await expect(success).to.be.equal(false)
                await expect(error).to.be.equal("Error:newOwner can not be a guardian");
            });

            it("should not be able to call executeRecovery if already in the process of Recovery", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, [guardian1.address]);

                await manager.relay(walletModule, "executeRecovery",
                    [wallet.address, owner2.address], wallet, utils.sortWalletByAddress([guardian1.address]));

                const txReceipt = await manager.relay(walletModule, "executeRecovery",
                    [wallet.address, owner2.address], wallet, [guardian1.address]);
                const { success, error } = utils.parseRelayReceipt(txReceipt);
                await expect(success).to.be.equal(false)
                await expect(error).to.be.equal("Error: is recovery");
            });
            it("when newowner is aready an owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, [guardian1.address]);
                const txReceipt = await manager.relay(walletModule, "executeRecovery",
                    [wallet.address, owner1.address], wallet, [guardian1.address]);
                const { success, error } = utils.parseRelayReceipt(txReceipt);
                await expect(success).to.be.equal(false)
                await expect(error).to.be.equal("Error:newOwner is already a owner");
            })
        })
    });
    describe("finalize recovery", () => {
        it("finalize after the recovey period", async () => {
            const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
            const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
            const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
            const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
            const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
            const guardians = [guardian1.address, guardian2.address, guardian3.address]
            const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
            await addGuardians(guardianStorage, wallet, guardians);

            await manager.relay(
                walletModule,
                "executeRecovery",
                [wallet.address, owner2.address],
                wallet,
                utils.sortWalletByAddress([guardian1.address, guardian2.address]),
            );
            await utils.increaseTime(40);
            await manager.relay(walletModule, "finalizeRecovery", [wallet.address], wallet, []);
            const isLocked = await walletModule.isLocked(wallet.address);
            await expect(isLocked).to.be.equal(false)
            let isOwner = await walletModule.isOwner(wallet.address, owner1.address);
            await expect(isOwner).to.be.equal(false)
            isOwner = await walletModule.isOwner(wallet.address, owner2.address);
            await expect(isOwner).to.be.equal(true)

            const recoveryConfig = await walletModule.getRecovery(wallet.address);
            await expect(recoveryConfig._newOwner).to.be.equal(ethers.constants.AddressZero);
            await expect(recoveryConfig._executeTime.toNumber()).to.be.equal(0);
            await expect(recoveryConfig._guardianCount.toNumber()).to.be.equal(0);
        })
        it("finalize between recoevery period", async () => {
            const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
            const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
            const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
            const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
            const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
            const guardians = [guardian1.address, guardian2.address, guardian3.address]
            const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
            await addGuardians(guardianStorage, wallet, guardians);

            await manager.relay(
                walletModule,
                "executeRecovery",
                [wallet.address, owner2.address],
                wallet,
                utils.sortWalletByAddress([guardian1.address, guardian2.address]),
            );
            const txReceipt = await manager.relay(walletModule, "finalizeRecovery", [wallet.address], wallet, []);
            const { success, error } = utils.parseRelayReceipt(txReceipt);
            await expect(success).to.be.equal(false)
            await expect(error).to.be.equal("Error:recovery period not end");

            const isLocked = await walletModule.isLocked(wallet.address);
            await expect(isLocked).to.be.equal(true)
        })
    })
    describe("cancel recovery", () => {
        describe("EOA guardians", () => {
            it("2 guardian cancel", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);

                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWith2Guardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2)
            })
            it("guardian + owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWithOwnerAndGuardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2)
            })
            it("only 1 guardian", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWith1Guardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2)
            })
            it("only owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWithOwner(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2)
            })
            it("duplicate guardian signatures", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWithDuplicateGuardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2)
            });
            it("non guardians signatures", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);
                const nonguardian = web3.eth.accounts.privateKeyToAccount(accounts[5].privateKey)
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWithNonGuardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2, nonguardian)
            });
        })
        describe("samart contrat guardians", () => {
            it("2 guardian cancel", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address, guardian3.address])
                await addGuardians(guardianStorage, wallet, guardians);
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWith2Guardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2)
            })
            it("guardian + owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address, guardian3.address])
                await addGuardians(guardianStorage, wallet, guardians);
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWithOwnerAndGuardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2)
            })
            it("only 1 guardian", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address, guardian3.address])
                await addGuardians(guardianStorage, wallet, guardians);
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWith1Guardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2)
            })
            it("only owner", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address, guardian3.address])
                await addGuardians(guardianStorage, wallet, guardians);
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWithOwner(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2)
            })
            it("duplicate guardian signatures", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                const guardians = await createSmartContractGuardians(walletModule, [guardian1.address, guardian2.address, guardian3.address])
                await addGuardians(guardianStorage, wallet, guardians);
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWithDuplicateGuardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2)
            });
            it("non guardians signatures", async () => {
                const owner1 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
                const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
                const guardian1 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
                const guardian2 = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
                const guardian3 = web3.eth.accounts.privateKeyToAccount(accounts[4].privateKey)
                const guardians = [guardian1.address, guardian2.address, guardian3.address]
                const { guardianStorage, walletModule, wallet, manager } = await beforeTest(owner1, owner2)
                await addGuardians(guardianStorage, wallet, guardians);
                const nonguardian = web3.eth.accounts.privateKeyToAccount(accounts[5].privateKey)
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet.address, owner2.address],
                    wallet,
                    utils.sortWalletByAddress([guardian1.address, guardian2.address]),
                );
                await CancelWithNonGuardian(manager, walletModule, wallet, guardian1, guardian2, owner1, owner2, nonguardian)
            });
        })
    })
});