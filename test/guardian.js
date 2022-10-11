const utils = require("../utils/utilities.js");
const truffleAssert = require("truffle-assertions");
const { assert } = require("chai");

const Factory = artifacts.require('factory');
const BaseWallet = artifacts.require('BaseWallet');
const Authoriser = artifacts.require("Authoriser");
const GuardianStorage = artifacts.require('GuardianStorage');
const TransferStorage = artifacts.require("TransferStorage");
const TestModule = artifacts.require("TestModule");
const WalletModule = artifacts.require('WalletModule');
const Registry = artifacts.require("ModuleRegistry");
const UniswapV2Router01 = artifacts.require("DummyUniV2Router");

const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;

contract("GuardianManager", function (accounts) {
  const owner_1 = accounts[1];
  const owner_2 = accounts[2];
  const owner_3 = accounts[3]
  const guardian_1 = accounts[4];
  const guardian_2 = accounts[5];
  const guardian_3 = accounts[6];
  const guardian_4 = accounts[7];
  const guardian_5 = accounts[8];

  const module = accounts[0];
  let wallet_1;
  let wallet_2;
  let wallet1
  let guardianStorage
  let transferStorage
  let authoriser
  let modules;
  let walletModule;
  let incorrectGuardian
  let registry;
  let uniswapRouter
  before(async () => {
    incorrectGuardian = await TestModule.new();
    modules = [module];
    wallet_1 = await BaseWallet.new();
    wallet_2 = await BaseWallet.new();
    wallet1 = wallet_1.address;
    guardianStorage = await GuardianStorage.new();
    registry = await Registry.new();
    transferStorage = await TransferStorage.new();
    authoriser = await Authoriser.new(0);
    uniswapRouter = await UniswapV2Router01.new();
    walletModule = await WalletModule.new(registry.address,guardianStorage.address, transferStorage.address, authoriser.address, uniswapRouter.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);
    console.log(owner_1)
    console.log(modules)
    await wallet_1.init(owner_1, modules);
    await wallet_1.addOwner(owner_2);
    await wallet_1.addOwner(owner_3);
    // await wallet_2.init(owner_2,modules)
  });
  beforeEach(async () => {
    guardianStorage = await GuardianStorage.new();
    walletModule = await WalletModule.new(registry.address,guardianStorage.address, transferStorage.address, authoriser.address, uniswapRouter.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);
  })

  describe("test GuardianStorage", () => {
    it("add guardian", async () => {
      await guardianStorage.addGuardian(wallet_1.address, guardian_1);
      await guardianStorage.addGuardian(wallet_1.address, guardian_2);
      const isGuardian11 = await guardianStorage.isGuardian(wallet_1.address, guardian_1);
      const isGuardian12 = await guardianStorage.isGuardian(wallet_2.address, guardian_1);
      const isGuardian21 = await guardianStorage.isGuardian(wallet_1.address, guardian_2);
      const isGuardian22 = await guardianStorage.isGuardian(wallet_2.address, guardian_2);
      assert.isTrue(isGuardian11)
      assert.isFalse(isGuardian12)
      assert.isTrue(isGuardian21)
      assert.isFalse(isGuardian22)
      await guardianStorage.addGuardian(wallet_2.address, guardian_3);
      await guardianStorage.addGuardian(wallet_2.address, guardian_4);
      const isGuardian31 = await guardianStorage.isGuardian(wallet_1.address, guardian_3);
      const isGuardian32 = await guardianStorage.isGuardian(wallet_2.address, guardian_3);
      const isGuardian41 = await guardianStorage.isGuardian(wallet_1.address, guardian_4);
      const isGuardian42 = await guardianStorage.isGuardian(wallet_2.address, guardian_4);
      assert.isTrue(isGuardian32)
      assert.isFalse(isGuardian31)
      assert.isTrue(isGuardian42)
      assert.isFalse(isGuardian41)
      await guardianStorage.addGuardian(wallet_1.address, guardian_5);
      console.log("guardian of wallet_1")
      console.log(await guardianStorage.getGuardians(wallet_1.address))
      let wallet1GuardianCount = await guardianStorage.guardianCount(wallet_1.address)
      wallet1GuardianCount = wallet1GuardianCount.toNumber()
      assert.equal(wallet1GuardianCount, 3)
      console.log("guardian of wallet_2")
      let wallet2GuardianCount = await guardianStorage.guardianCount(wallet_2.address)
      wallet2GuardianCount = wallet2GuardianCount.toNumber()
      assert.equal(wallet2GuardianCount, 2)
      console.log(await guardianStorage.getGuardians(wallet_2.address))
    });
    it("delete guardian", async () => {
      await guardianStorage.addGuardian(wallet_1.address, guardian_1);
      await guardianStorage.addGuardian(wallet_1.address, guardian_2);
      await guardianStorage.addGuardian(wallet_2.address, guardian_3);
      await guardianStorage.addGuardian(wallet_2.address, guardian_4);
      await guardianStorage.addGuardian(wallet_1.address, guardian_5);
      await guardianStorage.revokeGuardian(wallet_1.address, guardian_1);
      await guardianStorage.revokeGuardian(wallet_2.address, guardian_3);
      console.log("guardian of wallet_1")
      console.log(await guardianStorage.getGuardians(wallet_1.address))
      console.log("guardian of wallet_2")
      console.log(await guardianStorage.getGuardians(wallet_2.address))
    })
  });

  describe("test guardianMAnager", () => {
    describe("add guardian", () => {
      it("add owner to guardian", async () => {
        await truffleAssert.reverts(walletModule.addGuardian(wallet1, owner_1, { from: owner_1 }), "Error: owner can not be a guardian")
        await truffleAssert.reverts(walletModule.addGuardian(wallet1, owner_2, { from: owner_1 }), "Error: owner can not be a guardian")
        await truffleAssert.reverts(walletModule.addGuardian(wallet1, owner_3, { from: owner_1 }), "Error: owner can not be a guardian")
      })

      it("nonowner add guardian", async () => {
        await truffleAssert.reverts(walletModule.addGuardian(wallet1, guardian_1, { from: guardian_1 }), "Error:must be owner/self")
        await truffleAssert.reverts(walletModule.addGuardian(wallet1, guardian_1), "Error:must be owner/self")
      })

      it("let owner add guardain", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 })
        let isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await utils.increaseTime(30);
        await walletModule.confirmGuardianAddition(wallet1, guardian_1);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian)

        await walletModule.addGuardian(wallet1, guardian_2, { from: owner_2 });
        isGuardian = await walletModule.isGuardian(wallet1, guardian_2);
        assert.isFalse(isGuardian)
        await utils.increaseTime(30);
        await walletModule.confirmGuardianAddition(wallet1, guardian_2);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_2);
        assert.isTrue(isGuardian)

        await walletModule.addGuardian(wallet1, guardian_3, { from: owner_3 });
        isGuardian = await walletModule.isGuardian(wallet1, guardian_3);
        assert.isFalse(isGuardian)
        await utils.increaseTime(30);
        await walletModule.confirmGuardianAddition(wallet1, guardian_3);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_3);
        assert.isTrue(isGuardian)


        let guardains = await walletModule.getGuardians(wallet1);
        console.log(guardains)
      })

      it("confirm too early", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 });
        let isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await truffleAssert.reverts(walletModule.confirmGuardianAddition(wallet1, guardian_1), "Error: pending addition not over")
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
      })

      it("confirm after time out", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 });
        await utils.increaseTime(50);
        let isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await truffleAssert.reverts(walletModule.confirmGuardianAddition(wallet1, guardian_1), "pending addition expired")
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
      })

      it("add guardian again after time out", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 });
        await utils.increaseTime(50);
        let isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)

        await truffleAssert.reverts(walletModule.confirmGuardianAddition(wallet1, guardian_1), "pending addition expired")
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)

        // add again
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 });
        await utils.increaseTime(30);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await walletModule.confirmGuardianAddition(wallet1, guardian_1);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian)
      })

      it("add repeated guardian", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 });
        await utils.increaseTime(30);
        await walletModule.confirmGuardianAddition(wallet1, guardian_1);
        await truffleAssert.reverts(walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 }), "Error:is already a guardian")
      })
      it("make repeated addition request", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 });
        await truffleAssert.reverts(walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 }), "Error:duplicate pending addition");
      })
      it("add wallet to guardian", async () => {
        await walletModule.addGuardian(wallet1, wallet_2.address, { from: owner_1 });
        let isGuardian = await walletModule.isGuardian(wallet1, wallet_2.address);
        assert.isFalse(isGuardian)
        utils.evmIncreaseTime(30)
        await walletModule.confirmGuardianAddition(wallet1, wallet_2.address);
        isGuardian = await walletModule.isGuardian(wallet1, wallet_2.address);
        assert.isTrue(isGuardian)
      })
      it("add not EOA/wallet",async () =>{
        await truffleAssert.reverts(walletModule.addGuardian(wallet1,incorrectGuardian.address,{from:owner_1}), "Error:must be EOA/ wallet");
      })
      it("cancle addition", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 });
        let isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await walletModule.cancelGuardianAddition(wallet1, guardian_1, { from: owner_1 })
        truffleAssert.reverts(walletModule.confirmGuardianAddition(wallet1, guardian_1), "Error: no pending addition")
      })
    })

    describe("Revoke Guardian", () => {
      it("revoke guardian", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 })
        let isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await utils.increaseTime(30);
        await walletModule.confirmGuardianAddition(wallet1, guardian_1);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian)

        await walletModule.revokeGuardian(wallet1, guardian_1, { from: owner_1 })
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian);
        utils.increaseTime(30)

        await walletModule.confirmGuardianRevokation(wallet1, guardian_1)
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian);
      })

      it("revoke a nonexistent guardian", async () => {
        await truffleAssert.reverts(walletModule.revokeGuardian(wallet1, guardian_1, { from: owner_1 }), "Error:is not a guardian")
      })
      it("nonowner revoke guardian", async () => {
        await truffleAssert.reverts(walletModule.addGuardian(wallet1, guardian_1, { from: guardian_2 }), "Error:must be owner/self")
        await truffleAssert.reverts(walletModule.addGuardian(wallet1, guardian_1), "Error:must be owner/self")
      })
      it("confirm revokation too early", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 })
        let isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await utils.increaseTime(30);
        await walletModule.confirmGuardianAddition(wallet1, guardian_1);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian)

        await walletModule.revokeGuardian(wallet1, guardian_1, { from: owner_1 })
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian);
        await truffleAssert.reverts(walletModule.confirmGuardianRevokation(wallet1, guardian_1), "Error: pending revokation not over")
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian);
      })
      it("confirm revokation aftar timeout", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 })
        let isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await utils.increaseTime(30);
        await walletModule.confirmGuardianAddition(wallet1, guardian_1);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian)

        await walletModule.revokeGuardian(wallet1, guardian_1, { from: owner_1 })
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian);
        utils.increaseTime(50)
        await truffleAssert.reverts(walletModule.confirmGuardianRevokation(wallet1, guardian_1), "Error:pending revokation expired")
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian);
      })
      it("add guardian after revoke", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 })
        let isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await utils.increaseTime(30);
        await walletModule.confirmGuardianAddition(wallet1, guardian_1);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian)

        await walletModule.revokeGuardian(wallet1, guardian_1, { from: owner_1 })
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian);
        utils.increaseTime(30)
        await walletModule.confirmGuardianRevokation(wallet1, guardian_1)
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian);

        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 })
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await utils.increaseTime(30);
        await walletModule.confirmGuardianAddition(wallet1, guardian_1);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian)
      })
      it("make repeated revokation request", async () =>{
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 })
        let isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await utils.increaseTime(30);
        await walletModule.confirmGuardianAddition(wallet1, guardian_1);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian)

        await walletModule.revokeGuardian(wallet1, guardian_1, { from: owner_1 })
        await truffleAssert.reverts(walletModule.revokeGuardian(wallet1, guardian_1, { from: owner_1 }),"Error:duplicate pending revoketion")
      })
      it("cancel recokation", async () => {
        await walletModule.addGuardian(wallet1, guardian_1, { from: owner_1 })
        let isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isFalse(isGuardian)
        await utils.increaseTime(30);
        await walletModule.confirmGuardianAddition(wallet1, guardian_1);
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian)

        await walletModule.revokeGuardian(wallet1, guardian_1, { from: owner_1 })
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian);
        await walletModule.cancelGuardianRevokation(wallet1, guardian_1, { from: owner_1 })
        await truffleAssert.reverts(walletModule.confirmGuardianRevokation(wallet1, guardian_1), "Error: no pending revokation")
        isGuardian = await walletModule.isGuardian(wallet1, guardian_1);
        assert.isTrue(isGuardian);
      })

    })

    describe("incorrect cancle request", () => {
      it("cancle nonexistent addition / revokation", async () => {
        await truffleAssert.reverts(walletModule.cancelGuardianRevokation(wallet1, guardian_1, { from: owner_1 }), "Error: no pending revokation")
        await truffleAssert.reverts(walletModule.cancelGuardianAddition(wallet1, guardian_1, { from: owner_1 }), "Error:no pending addition")
      })
      it("nonowner cancle addition",async () => {
        await walletModule.addGuardian(wallet1,guardian_1,{from: owner_1})
        await truffleAssert.reverts(walletModule.cancelGuardianAddition(wallet1, guardian_1), "Error:must be owner/self")
        await truffleAssert.reverts(walletModule.cancelGuardianAddition(wallet1, guardian_1, {from:guardian_2}), "Error:must be owner/self")
      })
      it("nonowner cancle revokation",async () => {
        await walletModule.addGuardian(wallet1,guardian_1,{from: owner_1})
        utils.evmIncreaseTime(30)
        await walletModule.confirmGuardianAddition(wallet1,guardian_1)
        await walletModule.revokeGuardian(wallet1,guardian_1,{from:owner_1})
        await truffleAssert.reverts(walletModule.cancelGuardianRevokation(wallet1, guardian_1), "Error:must be owner/self")
        await truffleAssert.reverts(walletModule.cancelGuardianRevokation(wallet1, guardian_1,{from:guardian_1}), "Error:must be owner/self")

      })
    })
  })

});
