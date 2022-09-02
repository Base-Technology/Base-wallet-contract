const utils = require("../utils/utilities.js");
const truffleAssert = require("truffle-assertions");
const { assert } = require("chai");
const RelayManager = require("../utils/relay-manager.js");
const ethers = require("ethers");
const BN = require("bn.js");
const { isBN } = require("bn.js");
const UniswapV2Router01 = artifacts.require("DummyUniV2Router");


const BaseWallet = artifacts.require('BaseWallet');
const GuardianStorage = artifacts.require('GuardianStorage');
const TransferStorage = artifacts.require("TransferStorage");
const Authoriser = artifacts.require("Authoriser");
const WalletModule = artifacts.require('WalletModule');

const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;

const ZERO_ADDRESS = ethers.constants.AddressZero;

const WRONG_SIGNATURE_NUMBER_REVERT_MSG = "Wrong number of signatures";
const INVALID_SIGNATURES_REVERT_MSG = "Erro:Invalid signatures";

contract("recovery", function (accounts) {
    const owner = accounts[1];
    const owner_2 = accounts[2];
    const guardian_1 = accounts[2];
    const guardian_2 = accounts[3];
    const guardian_3 = accounts[4];
    const refundAddress = accounts[5];
    const relayer = accounts[6];

    const module = accounts[0];
    let wallet_1;
    let wallet_2
    let wallet1
    let wallet2
    let guardianStorage
    let transferStorage;
    let authoriser;


    let modules;
    let walletModule;
    let incorrectGuardian

    before(async () => {
        modules = [module];

        wallet_1 = await BaseWallet.new();
        wallet1 = wallet_1.address;
        wallet_2 = await BaseWallet.new();
        wallet2 = wallet_2.address;

        guardianStorage = await GuardianStorage.new();
        transferStorage = await TransferStorage.new();
        authoriser = await Authoriser.new(0);

        const uniswapRouter = await UniswapV2Router01.new();
        console.log(4)

        await wallet_1.send(new BN("1000000000000000000"));

        walletModule = await WalletModule.new(guardianStorage.address, transferStorage.address, authoriser.address, uniswapRouter.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);

        await wallet_1.init(owner, modules);
        await wallet_2.init(owner, modules);

        manager = new RelayManager(guardianStorage.address, ZERO_ADDRESS);
    });
    async function addGuardians(guardians) {
        for (const guardian of guardians)
            await guardianStorage.addGuardian(wallet1, guardian)
    }
    function testExecuteRecovery(guardians) {
        it("execute recovery with majority guardians", async () => {
            console.log(guardians)
            let isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner)
            const majority = guardians.slice(0, Math.ceil(guardians.length / 2))
            await manager.relay(walletModule, "executeRecovery", [wallet1, owner_2], wallet_1, utils.sortWalletByAddress(majority))

            const isLocked = await walletModule.isLocked(wallet1)
            assert.isTrue(isLocked)
            console.log("2222")

            const recoveryConfig = await walletModule.getRecovery(wallet1);
            assert.equal(recoveryConfig._newOwner, owner_2)
            assert.equal(recoveryConfig._guardianCount, guardians.length);
            const recoveryPeriod = new BN(RECOVERY_PERIOD)
            const timestamp = await utils.getTimestamp()
            assert.closeTo(recoveryConfig._executeTime.toNumber(), recoveryPeriod.add(new BN(timestamp)).toNumber())

            isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner)
        })
        it("execute recovery with owner", async () => {
            let isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner)

            const expectedRevertMsg = guardians.length >= 3 ? WRONG_SIGNATURE_NUMBER_REVERT_MSG : INVALID_SIGNATURES_REVERT_MSG;
            await truffleAssert.reverts(
                manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet1, owner_2],
                    wallet_1,
                    [owner],
                ), expectedRevertMsg,
            );

            isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner)
        })
    }
    describe("Execute Recovery", () => {
        it("execute recovery with no guardians", async () => {

            let isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner)

            await truffleAssert.reverts(manager.relay(walletModule, "executeRecovery", [wallet1, owner_2], wallet_1, []), "Error: no guardians on wallet")

            const isLocked = await walletModule.isLocked(wallet1)
            assert.isFalse(isLocked)

            isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner)
        })
        describe("execute with 2 guardians", () => {
            beforeEach(async () => {
                await addGuardians([guardian_1, guardian_2]);
            })
            testExecuteRecovery([guardian_1, guardian_2])
        })
    })
});
