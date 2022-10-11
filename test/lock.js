const utils = require("../utils/utilities.js");
const truffleAssert = require("truffle-assertions");
const { assert } = require("chai");

const Factory = artifacts.require('factory');
const BaseWallet = artifacts.require('BaseWallet');
const GuardianStorage = artifacts.require('GuardianStorage');
const TestModule = artifacts.require("TestModule");
const WalletModule = artifacts.require('WalletModule');
const TransferStorage = artifacts.require("TransferStorage");
const Authoriser = artifacts.require("Authoriser");
const Registry = artifacts.require("ModuleRegistry");
const UniswapV2Router01 = artifacts.require("DummyUniV2Router");

const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;


contract("lock/unlock", function (accounts) {
    const owner = accounts[1];
    const guardian_1 = accounts[2];
    const guardian_2 = accounts[3];
    const nonguardian = accounts[4]

    const module = accounts[0];
    let wallet_1;
    let wallet_2
    let wallet1
    let wallet2
    let guardianStorage
    let registry;
    let transferStorage
    let authoriser
    let modules;
    let walletModule;
    let incorrectGuardian

    before(async () => {
        modules = [module];

        wallet_1 = await BaseWallet.new();
        wallet1 = wallet_1.address;
        wallet_2 = await BaseWallet.new();
        wallet2 = wallet_2.address;
        registry = await Registry.new();
        guardianStorage = await GuardianStorage.new();
        transferStorage = await TransferStorage.new();
        authoriser = await Authoriser.new(0);
        uniswapRouter = await UniswapV2Router01.new();

        walletModule = await WalletModule.new(registry.address,guardianStorage.address, transferStorage.address, authoriser.address, uniswapRouter.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);

        await wallet_1.init(owner, modules);
        await wallet_2.init(owner, modules);

        await guardianStorage.addGuardian(wallet1, guardian_1,{from:owner});
        await guardianStorage.addGuardian(wallet1, guardian_2,{from:owner});
        await guardianStorage.addGuardian(wallet2, guardian_1,{from:owner});
        await guardianStorage.addGuardian(wallet2, guardian_2,{from:owner});
    });

    describe("test lock/unlock", () => {
        it("lock wallet by nonguardian", async () => {
            await truffleAssert.reverts(walletModule.lock(wallet1, { from: nonguardian }), "Error:must be guardian/self");
            let isLock = await walletModule.isLocked(wallet1)
            assert.isFalse(isLock)
            await truffleAssert.reverts(walletModule.lock(wallet1), "Error:must be guardian/self");
            isLock = await walletModule.isLocked(wallet1)
            assert.isFalse(isLock)
        });
        it("lock wallet when is lock", async () => {
            await walletModule.lock(wallet1, { from: guardian_1 })
            let isLock = await walletModule.isLocked(wallet1)
            assert.isTrue(isLock)
            isLock = await guardianStorage.isLocked(wallet1)
            assert.isFalse(isLock)
            await truffleAssert.reverts(walletModule.lock(wallet1, { from: guardian_1 }), "Error:wallet is lock")

            await walletModule.lock(wallet2, { from: guardian_1 })
            isLock = await walletModule.isLocked(wallet2)
            assert.isTrue(isLock)
            isLock = await guardianStorage.isLocked(wallet2)
            assert.isFalse(isLock)
            await truffleAssert.reverts(walletModule.lock(wallet2, { from: guardian_2 }), "Error:wallet is lock")

            await walletModule.unlock(wallet1, { from: guardian_1 })
            await walletModule.unlock(wallet2, { from: guardian_1 })
        })
        it("unlock without lock", async () => {
            await truffleAssert.reverts(walletModule.unlock(wallet1, { from: guardian_1 }), "Error:wallet is unlock")
        })
        it("lock and unlock", async () => {
            await walletModule.lock(wallet1, { from: guardian_1 })
            let isLock = await walletModule.isLocked(wallet1)
            assert.isTrue(isLock)
            isLock = await guardianStorage.isLocked(wallet1)
            assert.isFalse(isLock)
            let releasetime = await walletModule.getLock(wallet1)
            releasetime = releasetime.toNumber()
            assert.isAbove(releasetime,0)
            await walletModule.unlock(wallet1, { from: guardian_1 })
            isLock = await walletModule.isLocked(wallet1)
            assert.isFalse(isLock)
            releasetime = await walletModule.getLock(wallet1)
            releasetime = releasetime.toNumber()
            assert.equal(releasetime,0)

            await walletModule.lock(wallet1, { from: guardian_1 })
            isLock = await walletModule.isLocked(wallet1)
            assert.isTrue(isLock)
            isLock = await guardianStorage.isLocked(wallet1)
            assert.isFalse(isLock)
            releasetime = await walletModule.getLock(wallet1)
            releasetime = releasetime.toNumber()
            assert.isAbove(releasetime,0)
            await walletModule.unlock(wallet1, { from: guardian_2 })
            isLock = await walletModule.isLocked(wallet1)
            assert.isFalse(isLock)
            releasetime = await walletModule.getLock(wallet1)
            releasetime = releasetime.toNumber()
            assert.equal(releasetime,0)
        })
        it("auto-unlock after lock period",async() => {
            await walletModule.lock(wallet1, { from: guardian_1 })
            let isLock = await walletModule.isLocked(wallet1)
            assert.isTrue(isLock)
            isLock = await guardianStorage.isLocked(wallet1)
            assert.isFalse(isLock)
            let releasetime = await walletModule.getLock(wallet1)
            releasetime = releasetime.toNumber()
            assert.isAbove(releasetime,0)

            await utils.increaseTime(130)

            isLock = await walletModule.isLocked(wallet1)
            assert.isFalse(isLock,"****")
            releasetime = await walletModule.getLock(wallet1)
            releasetime = releasetime.toNumber()
            assert.equal(releasetime,0)
        })
    });

});
