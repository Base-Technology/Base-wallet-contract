const utils = require("../utils/utilities.js");
const truffleAssert = require("truffle-assertions");
const { assert } = require("chai");
const RelayManager = require("../utils/relay-manager.js");
const ethers = require("ethers");
const BN = require("bn.js");
const { isBN } = require("bn.js");
const { LexRuntime } = require("aws-sdk");

const UniswapV2Router01 = artifacts.require("DummyUniV2Router");

const BaseWallet = artifacts.require('BaseWallet');
const Proxy = artifacts.require("Proxy");
const GuardianStorage = artifacts.require('GuardianStorage');
const TransferStorage = artifacts.require("TransferStorage");
const Authoriser = artifacts.require("Authoriser");
const WalletModule = artifacts.require('WalletModule');
const Registry = artifacts.require("ModuleRegistry");


const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;

const ZERO_ADDRESS = ethers.constants.AddressZero;

const WRONG_SIGNATURE_NUMBER_REVERT_MSG = "Wrong number of signatures";
const INVALID_SIGNATURES_REVERT_MSG = "Error:Invalid signatures";

contract("simpleRecovery", function (accounts) {
    const owner = accounts[1];
    const owner_2 = accounts[2];
    const guardian_1 = accounts[3];
    const guardian_2 = accounts[4];
    const guardian_3 = accounts[5];
    const refundAddress = accounts[6];
    const relayer = accounts[7];

    const module = accounts[0];
    let wallet_1;
    let wallet_2
    let wallet1
    let wallet2
    let guardianStorage
    let transferStorage;
    let authoriser;
    let registry;


    let modules;
    let walletModule;
    let walletImplementation

    before(async () => {
        modules = [module];

        guardianStorage = await GuardianStorage.new();
        transferStorage = await TransferStorage.new();
        authoriser = await Authoriser.new(0);
        registry = await Registry.new();

        const uniswapRouter = await UniswapV2Router01.new();

        walletModule = await WalletModule.new(registry.address,guardianStorage.address, transferStorage.address, authoriser.address, uniswapRouter.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);

        await authoriser.addDapp(0, relayer, ZERO_ADDRESS)

        manager = new RelayManager(guardianStorage.address, ZERO_ADDRESS);
        walletImplementation = await BaseWallet.new()
        wallet_2 = await BaseWallet.new();
        wallet2 = wallet_2.address;
        await wallet_2.init(owner, modules);
    });

    beforeEach(async () => {
        wallet_1 = await BaseWallet.new();
        wallet1 = wallet_1.address;
        await wallet_1.init(owner, modules);
    })
    async function addGuardians(guardians) {
        for (const guardian of guardians) {
            await guardianStorage.addGuardian(wallet1, guardian)
        }
    }
    async function executeRecovery(guardians) {
        let isOwner = await walletModule.isOwner(wallet1, owner);
        assert.isTrue(isOwner)
        isOwner = await walletModule.isOwner(wallet1, owner_2);
        assert.isFalse(isOwner)

        const majority = guardians.slice(0, Math.ceil((guardians.length) / 2));

        await walletModule.executeRecovery_v2(majority, wallet1, owner_2);
        let isLocked = await walletModule.isLocked(wallet1)
        assert.isTrue(isLocked);

        const recoveryConfig = await walletModule.getRecovery(wallet1);
        assert.equal(recoveryConfig._newOwner, owner_2)
        assert.equal(recoveryConfig._guardianCount.toNumber(), guardians.length);
        const recoveryPeriod = new BN(RECOVERY_PERIOD)
        const timestamp = await utils.getTimestamp()
        assert.closeTo(recoveryConfig._executeTime.toNumber(), recoveryPeriod.add(new BN(timestamp)).toNumber(), 1)

        isOwner = await walletModule.isOwner(wallet1, owner);
        assert.isTrue(isOwner)
        isOwner = await walletModule.isOwner(wallet1, owner_2);
        assert.isFalse(isOwner)
    }
    function testExecuteRecovery(guardians) {
        it("execute recovery with majority guardians", async () => {
            await executeRecovery(guardians)
        })
        it("when wallet has no guardian", async () => {
            for (const guardian of guardians) {
                await guardianStorage.revokeGuardian(wallet1, guardian)
            }
            await truffleAssert.reverts(walletModule.executeRecovery_v2([], wallet1, owner_2), "wallet must have at least 1 guardian to recovery")
        })
        it("execute recovery with minority guardians", async () => {
            const minority = guardians.slice(0, Math.ceil((guardians.length) / 2) - 1);
            await truffleAssert.reverts(walletModule.executeRecovery_v2(minority, wallet1, owner_2), "not enough executor")
            await truffleAssert.reverts(walletModule.executeRecovery_v2([], wallet1, owner_2), "not enough executor")
        })
        it("when owner(not guardians) execute recovery", async () => {
            const majority = guardians.slice(0, Math.ceil((guardians.length) / 2));
            const minority = guardians.slice(0, Math.ceil((guardians.length) / 2) - 1);
            await truffleAssert.reverts(walletModule.executeRecovery_v2([owner], wallet1, owner_2), "one of the executors is not guardian")
            await truffleAssert.reverts(walletModule.executeRecovery_v2([owner, ...majority], wallet1, owner_2), "one of the executors is not guardian")
            await truffleAssert.reverts(walletModule.executeRecovery_v2([owner, ...minority], wallet1, owner_2), "one of the executors is not guardian")
        })
        it("when is executing", async () => {
            const majority = guardians.slice(0, Math.ceil((guardians.length) / 2));
            await executeRecovery(guardians)
            await truffleAssert.reverts(walletModule.executeRecovery_v2(majority, wallet1, owner_2), "Error: is recovery")
        })
        it("when newOwner is address(0)", async () => {
            const majority = guardians.slice(0, Math.ceil((guardians.length) / 2));
            await truffleAssert.reverts(walletModule.executeRecovery_v2(majority, wallet1, ethers.constants.AddressZero), "Error:newOwner can not be address(0)");
            const isLocked = await walletModule.isLocked(wallet1)
            assert.isFalse(isLocked)
        })
        it("when newOwner is guardian", async () => {
            const majority = guardians.slice(0, Math.ceil((guardians.length) / 2));
            await truffleAssert.reverts(walletModule.executeRecovery_v2(majority, wallet1, guardians[0]), "Error:newOwner can not be a guardian");
            const isLocked = await walletModule.isLocked(wallet1)
            assert.isFalse(isLocked)
        })
        it("when newOwner is owner", async()=>{
            await wallet_1.addOwner(owner_2)
            const majority = guardians.slice(0, Math.ceil((guardians.length) / 2));
            await truffleAssert.reverts(walletModule.executeRecovery_v2(majority, wallet1, owner_2), "Error:newOwner is already a owner");
            const isLocked = await walletModule.isLocked(wallet1)
            assert.isFalse(isLocked)
        })
    }
    describe("Execute Recovery", () => {
        describe("When count of guardian = 2", () => {
            beforeEach(async () => {
                await addGuardians([guardian_1, guardian_2]);
            })
            testExecuteRecovery([guardian_1, guardian_2])
        })
        describe("When count of guardian = 3", () => {
            beforeEach(async () => {
                await addGuardians([guardian_1, guardian_2, guardian_3]);
            })
            testExecuteRecovery([guardian_1, guardian_2, guardian_3])
        })
    })
    describe("Finalize Recovery", () => {
        beforeEach(async () => {
            await addGuardians([guardian_1, guardian_2, guardian_3])
            await executeRecovery([guardian_1, guardian_2, guardian_3])
        })
        it("finalize after recovery period", async () => {
            await utils.increaseTime(40);

            await walletModule.finalizeRecovery(wallet1)
            const isLocked = await walletModule.isLocked(wallet1)
            assert.isFalse(isLocked)
            let isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isFalse(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isTrue(isOwner)
        })
        it("finalize before recovery period", async () => {
            await truffleAssert.reverts(walletModule.finalizeRecovery(wallet1), "Error:recovery period not end")
            const isLocked = await walletModule.isLocked(wallet1)
            assert.isTrue(isLocked);
            let isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner)
        })
        it("finalize when not recovery", async () => {
            await utils.increaseTime(40);
            await truffleAssert.reverts(walletModule.finalizeRecovery(wallet2), "Error:is no recovery")
        })
    })
    describe("Cancel recovery", () => {
        beforeEach(async () => {
            await addGuardians([guardian_1, guardian_2, guardian_3])
            await executeRecovery([guardian_1, guardian_2, guardian_3])
        })
        it("when 2 guardians cancel", async () => {
            await walletModule.cancelRecovery_v2([guardian_1, guardian_2], wallet1)
            const isLocked = await walletModule.isLocked(wallet1)
            assert.isFalse(isLocked)

            await utils.increaseTime(40)
            await truffleAssert.reverts(walletModule.finalizeRecovery(wallet1), "Error:is no recovery")
        })
        it("when owner and 1 guardian cancel", async () => {
            await walletModule.cancelRecovery_v2([owner, guardian_2],wallet1)
            const isLocked = await walletModule.isLocked(wallet1)
            assert.isFalse(isLocked)
            let isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner)
            await utils.increaseTime(40)
            await truffleAssert.reverts(walletModule.finalizeRecovery(wallet1), "Error:is no recovery")
        })
        it("when minority signatures cancel", async () => {
            await truffleAssert.reverts(walletModule.cancelRecovery_v2([guardian_1], wallet1), "not enough executor")
            let isLocked = await walletModule.isLocked(wallet1)
            assert.isTrue(isLocked)
            await truffleAssert.reverts(walletModule.cancelRecovery_v2([owner], wallet1), "not enough executor")
            isLocked = await walletModule.isLocked(wallet1)
            assert.isTrue(isLocked)
            await truffleAssert.reverts(walletModule.cancelRecovery_v2([], wallet1), "not enough executor")
            isLocked = await walletModule.isLocked(wallet1)
            assert.isTrue(isLocked)
        })
        it("when not guardian/ not oner cancel",async () => {
            await truffleAssert.reverts(walletModule.cancelRecovery_v2([guardian_1, owner_2, owner_2], wallet1), "one of the executors is not guardian/owner")
            const isLocked = await walletModule.isLocked(wallet1)
            assert.isTrue(isLocked)
        })
        it("cancel when not recovery", async () => {
            await truffleAssert.reverts(walletModule.cancelRecovery_v2([guardian_1, guardian_2], wallet2), "Error:is no recovery")
            const isLocked = await walletModule.isLocked(wallet1)
            assert.isTrue(isLocked)
        })
    })
});
