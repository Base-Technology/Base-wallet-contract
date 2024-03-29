const utils = require("../utils/utilities.js");
const truffleAssert = require("truffle-assertions");
const { assert } = require("chai");
const RelayManager = require("../utils/relay-manager.js");
const ethers = require("ethers");
const BN = require("bn.js");
const { isBN } = require("bn.js");

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

contract("recovery", function (accounts) {
    const owner = accounts[1];
    const owner_2 = accounts[2];
    const guardian_1 = accounts[3];
    const guardian_2 = accounts[4];
    const guardian_3 = accounts[5];
    const nonowner = accounts[6];
    const relayer = accounts[7];

    const module = accounts[0];
    let guardianStorage
    let transferStorage;
    let registry;
    let authoriser;


    let modules;
    let walletModule;
    let incorrectGuardian
    let walletImplementation

    before(async () => {

        guardianStorage = await GuardianStorage.new();
        transferStorage = await TransferStorage.new();
        authoriser = await Authoriser.new(0);
        registry = await Registry.new();

        const uniswapRouter = await UniswapV2Router01.new();

        walletModule = await WalletModule.new(registry.address, guardianStorage.address, transferStorage.address, authoriser.address, uniswapRouter.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);

        await authoriser.addDapp(0, relayer, ZERO_ADDRESS)

        manager = new RelayManager(guardianStorage.address, ZERO_ADDRESS);
        walletImplementation = await BaseWallet.new()
    });

    beforeEach(async () => {
        wallet_1 = await BaseWallet.new();
        wallet1 = wallet_1.address;
        await wallet_1.init(owner, [walletModule.address]);
    })
    async function addGuardians(guardians) {
        for (const guardian of guardians) {
            await guardianStorage.addGuardian(wallet1, guardian)
        }
    }
    async function createSmartContractGuardians(guardians) {
        const wallets = []
        for (let guardian of guardians) {
            const proxy = await Proxy.new(walletImplementation.address)
            const guardianWallet = await BaseWallet.at(proxy.address);
            await guardianWallet.init(guardian, [walletModule.address])
            wallets.push(guardianWallet.address)
        }
        return wallets
    }
    function testExecuteRecovery(guardians) {
        it("execute recovery with majority guardians", async () => {
            let isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner, '1')
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner, '2')

            const majority = guardians.slice(0, Math.ceil(guardians.length / 2))

            await manager.relay(walletModule, "executeRecovery", [wallet1, owner_2], wallet_1, utils.sortWalletByAddress(majority))

            const isLocked = await walletModule.isLocked(wallet1)
            assert.isTrue(isLocked, '5')

            const recoveryConfig = await walletModule.getRecovery(wallet1);
            assert.equal(recoveryConfig._newOwner, owner_2)
            assert.equal(recoveryConfig._guardianCount, guardians.length);
            const recoveryPeriod = new BN(RECOVERY_PERIOD)
            const timestamp = await utils.getTimestamp()
            assert.closeTo(recoveryConfig._executeTime.toNumber(), recoveryPeriod.add(new BN(timestamp)).toNumber(), 1)

            isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner, '3')
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner, '4')
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
        it("execute with majority guardians + owner", async () => {
            const majority = guardians.slice(0, Math.ceil(guardians.length / 2) - 1)
            await truffleAssert.reverts(manager.relay(walletModule, "executeRecovery", [wallet1, owner_2], wallet_1, [owner, ...utils.sortWalletByAddress(majority)]), INVALID_SIGNATURES_REVERT_MSG)
            const isLocked = await walletModule.isLocked(wallet1)
            assert.isFalse(isLocked)
        })
        it("execute with minority of guardians", async () => {
            const minority = guardians.slice(0, Math.ceil(guardians.length / 2) - 1)
            await truffleAssert.reverts(manager.relay(walletModule, "executeRecovery", [wallet1, owner_2], wallet_1, utils.sortWalletByAddress(minority)), WRONG_SIGNATURE_NUMBER_REVERT_MSG)

            const isLocked = await walletModule.isLocked(wallet1)
            assert.isFalse(isLocked)
        })
        it("majority guardians + non guardians signatures", async () => {
            const majority = guardians.slice(0, Math.ceil(guardians.length / 2) - 1)
            await truffleAssert.reverts(manager.relay(walletModule, "executeRecovery", [wallet1, owner_2], wallet_1, [nonowner, ...utils.sortWalletByAddress(majority)]), INVALID_SIGNATURES_REVERT_MSG)
            let isLocked = await walletModule.isLocked(wallet1)
            assert.isFalse(isLocked)

            await truffleAssert.reverts(manager.relay(walletModule, "executeRecovery", [wallet1, owner_2], wallet_1, [...utils.sortWalletByAddress(majority),nonowner]), INVALID_SIGNATURES_REVERT_MSG)
            isLocked = await walletModule.isLocked(wallet1)
            assert.isFalse(isLocked)
        });
    }

    function testCancelRecovery() {
        it("2 guardian cancel", async () => {
            await manager.relay(walletModule, "cancelRecovery", [wallet1], wallet_1, utils.sortWalletByAddress([guardian_1, guardian_2]));
            const isLocked = await walletModule.isLocked(wallet1);
            assert.isFalse(isLocked);
            await utils.increaseTime(40); // moving time to after the end of the recovery period
            const txReceipt = await manager.relay(walletModule, "finalizeRecovery", [wallet1], wallet_1, []);
            const { success, error } = utils.parseRelayReceipt(txReceipt);
            assert.isFalse(success);
            assert.equal(error, "Error:is no recovery");
            let isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner)

            const recoveryConfig = await walletModule.getRecovery(wallet1);
            assert.equal(recoveryConfig._newOwner, ethers.constants.AddressZero);
            assert.equal(recoveryConfig._executeTime.toNumber(), 0);
            assert.equal(recoveryConfig._guardianCount, 0);
        })
        it("guardian + owner", async () => {
            await manager.relay(walletModule, "cancelRecovery", [wallet1], wallet_1, [owner, guardian_1]);
            const isLocked = await walletModule.isLocked(wallet1);
            assert.isFalse(isLocked);
            await utils.increaseTime(40); // moving time to after the end of the recovery period
            const txReceipt = await manager.relay(walletModule, "finalizeRecovery", [wallet1], wallet_1, []);
            const { success, error } = utils.parseRelayReceipt(txReceipt);
            assert.isFalse(success);
            assert.equal(error, "Error:is no recovery");
            let isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isTrue(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isFalse(isOwner)
        })
        it("only 1 guardian",async () => {
            await truffleAssert.reverts(
                manager.relay(
                    walletModule,
                  "cancelRecovery",
                  [wallet1],
                  wallet_1,
                  [guardian_1],
                ), WRONG_SIGNATURE_NUMBER_REVERT_MSG,
              );
        
              const isLocked = await walletModule.isLocked(wallet1);
              assert.isTrue(isLocked);
        })
        it("only owner",async () => {
            await truffleAssert.reverts(
                manager.relay(
                    walletModule,
                  "cancelRecovery",
                  [wallet1],
                  wallet_1,
                  [owner],
                ), WRONG_SIGNATURE_NUMBER_REVERT_MSG,
              );
        
              const isLocked = await walletModule.isLocked(wallet1);
              assert.isTrue(isLocked);
        })
        it("duplicate guardian signatures", async () => {
            await truffleAssert.reverts(
              manager.relay(
                walletModule,
                "cancelRecovery",
                [wallet1],
                wallet_1,
                [guardian_1, guardian_1],
              ), INVALID_SIGNATURES_REVERT_MSG,
            );
      
            const isLocked = await walletModule.isLocked(wallet1);
            assert.isTrue(isLocked);
          });
      
          it("non guardians signatures", async () => {
            await truffleAssert.reverts(
              manager.relay(
                walletModule,
                "cancelRecovery",
                [wallet1],
                wallet_1,
                utils.sortWalletByAddress([guardian_1, nonowner]),
              ), INVALID_SIGNATURES_REVERT_MSG,
            );
      
            const isLocked = await walletModule.isLocked(wallet1);
            assert.isTrue(isLocked);
          });
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
        describe('execute with 3guardians', async () => {
            beforeEach(async () => {
                await addGuardians([guardian_1, guardian_2, guardian_3]);
            })
            testExecuteRecovery([guardian_1, guardian_2, guardian_3])
            it("execute recovery with duplicate guardian", async () => {
                await truffleAssert.reverts(
                    manager.relay(
                        walletModule,
                        "executeRecovery",
                        [wallet1, owner_2],
                        wallet_1,
                        utils.sortWalletByAddress([guardian_1, guardian_1]),
                    ), INVALID_SIGNATURES_REVERT_MSG
                )
            })
        })
        describe('execute with 2 samart contrat guardians', () => {
            let guardians
            beforeEach(async () => {
                guardians = await createSmartContractGuardians([guardian_1, guardian_2])
                await addGuardians(guardians)
            })
            testExecuteRecovery([guardian_1, guardian_2])
        })
        describe('execute with 3 samart contrat guardians', () => {
            let guardians
            beforeEach(async () => {
                guardians = await createSmartContractGuardians([guardian_1, guardian_2, guardian_3])
                await addGuardians(guardians)
            })
            testExecuteRecovery([guardian_1, guardian_2, guardian_3])
        })
        describe("Safety Checks", () => {
            it("execute with empty newOwner", async () => {
                await addGuardians([guardian_1])
                const txReceipt = await manager.relay(walletModule, "executeRecovery", [wallet1, ethers.constants.AddressZero], wallet_1, [guardian_1]);
                const { success, error } = utils.parseRelayReceipt(txReceipt);
                assert.isFalse(success);
                assert.equal(error, "Error:newOwner can not be address(0)");
            })
            it("execute when newOwner is guardian", async () => {
                await addGuardians([guardian_1])
                const txReceipt = await manager.relay(walletModule, "executeRecovery",
                    [wallet1, guardian_1], wallet_1, [guardian_1]);
                const { success, error } = utils.parseRelayReceipt(txReceipt);
                assert.isFalse(success);
                assert.equal(error, "Error:newOwner can not be a guardian");
            });

            it("should not be able to call executeRecovery if already in the process of Recovery", async () => {
                await addGuardians([guardian_1])

                await manager.relay(walletModule, "executeRecovery",
                    [wallet1, owner_2], wallet_1, utils.sortWalletByAddress([guardian_1]));

                const txReceipt = await manager.relay(walletModule, "executeRecovery",
                    [wallet1, owner_2], wallet_1, [guardian_1]);
                const { success, error } = utils.parseRelayReceipt(txReceipt);
                assert.isFalse(success);
                assert.equal(error, "Error: is recovery");
            });
            it("when newowner is aready an owner", async () => {
                await addGuardians([guardian_1])
                const txReceipt = await manager.relay(walletModule, "executeRecovery",
                    [wallet1, owner], wallet_1, [guardian_1]);
                const { success, error } = utils.parseRelayReceipt(txReceipt);
                assert.isFalse(success);
                assert.equal(error, "Error:newOwner is already a owner");
            })
        })
    })
    describe("finalize recovery", () => {
        beforeEach(async () => {
            await addGuardians([guardian_1, guardian_2, guardian_3])
        })
        it("finalize after the recovey period", async () => {
            await manager.relay(
                walletModule,
                "executeRecovery",
                [wallet1, owner_2],
                wallet_1,
                utils.sortWalletByAddress([guardian_1, guardian_2]),
            );
            await utils.increaseTime(40);
            await manager.relay(walletModule, "finalizeRecovery", [wallet1], wallet_1, []);
            const isLocked = await walletModule.isLocked(wallet1);
            assert.isFalse(isLocked, "should no longer be locked after finalization of recovery");
            let isOwner = await walletModule.isOwner(wallet1, owner);
            assert.isFalse(isOwner)
            isOwner = await walletModule.isOwner(wallet1, owner_2);
            assert.isTrue(isOwner)

            const recoveryConfig = await walletModule.getRecovery(wallet1);
            assert.equal(recoveryConfig._newOwner, ethers.constants.AddressZero);
            assert.equal(recoveryConfig._executeTime.toNumber(), 0);
            assert.equal(recoveryConfig._guardianCount, 0);
        })
        it("finalize between recoevery period", async () => {
            await manager.relay(
                walletModule,
                "executeRecovery",
                [wallet1, owner_2],
                wallet_1,
                utils.sortWalletByAddress([guardian_1, guardian_2]),
            );
            const txReceipt = await manager.relay(walletModule, "finalizeRecovery", [wallet1], wallet_1, []);
            const { success, error } = utils.parseRelayReceipt(txReceipt);
            assert.isFalse(success);
            assert.equal(error, "Error:recovery period not end");

            const isLocked = await walletModule.isLocked(wallet1);
            assert.isTrue(isLocked);
        })
    })
    describe("cancel recovery", () => {
        describe("EOA guardians", () => {
            beforeEach(async () => {
                await addGuardians([guardian_1, guardian_2, guardian_3])
                await manager.relay(
                    walletModule,
                    "executeRecovery",
                    [wallet1, owner_2],
                    wallet_1,
                    utils.sortWalletByAddress([guardian_1, guardian_2]),
                );
            })
            testCancelRecovery()
        })
        describe("samart contrat guardians", () => {
            beforeEach(async () => {
                const scGuardians = await createSmartContractGuardians([guardian_1,guardian_2, guardian_3]);
                await addGuardians(scGuardians);
                await manager.relay(
                    walletModule,
                  "executeRecovery",
                  [wallet1, owner_2],
                  wallet_1,
                  utils.sortWalletByAddress([guardian_1, guardian_2]),
                );
              });
        
              testCancelRecovery();
        })
    })
});
