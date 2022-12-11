const { assert } = require("chai");
const truffleAssert = require("truffle-assertions");
const ethers = require("ethers");
const BN = require("bn.js");

const RelayManager = require("../utils/relay-manager.js");
const utils = require("../utils/utilities.js");

const Factory = artifacts.require("Factory")
const BaseWallet = artifacts.require("BaseWallet");
const GuardianStorage = artifacts.require('GuardianStorage');
const TransferStorage = artifacts.require("TransferStorage");
const Authoriser = artifacts.require("DappRegistry");
const Registry = artifacts.require("ModuleRegistry");
const WalletModule = artifacts.require('WalletModule');

const UniswapV2Router01 = artifacts.require("DummyUniV2Router");

const ERC20 = artifacts.require("TestERC20");
const TestContract = artifacts.require("TestContract");
const Filter = artifacts.require("TestFilter");

const ZERO_BYTES = "0x"
const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;
const ZERO_ADDRESS = ethers.constants.AddressZero;
const { ETH_TOKEN } = require("../utils/utilities.js");

const CUSTOM_REGISTRY_ID = 12

contract("Authorisation", (accounts) => {
  let manager;

  const infrastructure = accounts[0]
  const owner = accounts[1]
  const nonwhitelisted = accounts[2]
  const guardian = accounts[3]
  const recipient = accounts[4]
  const registryOwner = accounts[5]
  const refundAddress = accounts[7]
  const relayer = accounts[8]

  let registry
  let transferStorage
  let guardianStorage
  let module
  let wallet
  let factory
  let filter
  let filter2
  let dappRegistry
  let contract
  let contract2
  let uniswapRouter

  before(async () => {
    registry = await Registry.new()
    guardianStorage = await GuardianStorage.new()
    transferStorage = await TransferStorage.new()
    uniswapRouter = await UniswapV2Router01.new()

    contract = await TestContract.new()
    contract2 = await TestContract.new()
    assert.equal(await contract.state(), 0)
    assert.equal(await contract2.state(), 0)
    filter = await Filter.new()
    filter2 = await Filter.new()

    const Implementation = await BaseWallet.new()
    factory = await Factory.new(Implementation.address, guardianStorage.address, refundAddress)
    await factory.addManager(infrastructure)

    manager = new RelayManager(guardianStorage.address, ZERO_ADDRESS)
  })
  async function setupRegistries() {
    dappRegistry = await Authoriser.new(SECURITY_PERIOD)
    await dappRegistry.createRegistry(CUSTOM_REGISTRY_ID, registryOwner)
    await dappRegistry.addDapp(0, contract.address, filter.address)
    await dappRegistry.addDapp(CUSTOM_REGISTRY_ID, contract2.address, filter.address, { from: registryOwner })
    await dappRegistry.addDapp(0, recipient, ZERO_ADDRESS)
    await dappRegistry.addDapp(0, relayer, ZERO_ADDRESS)
    await utils.increaseTime(SECURITY_PERIOD + 1)
    module = await WalletModule.new(registry.address, guardianStorage.address, transferStorage.address, dappRegistry.address, uniswapRouter.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD)
    await registry.registerModule(module.address, ethers.utils.formatBytes32String("WalletModule"))
  }
  async function enableCustomRegistry() {
    assert.isFalse(await dappRegistry.isEnabledRegistry(wallet.address, CUSTOM_REGISTRY_ID));
    const data = dappRegistry.contract.methods.toggleRegistry(CUSTOM_REGISTRY_ID, true).encodeABI();
    const transaction = utils.encodeTransaction(dappRegistry.address, 0, data);
    const txReceipt = await manager.relay(
      module,
      "multiCall",
      [wallet.address, [transaction]],
      wallet,
      [owner]);
    const { success, error } = await utils.parseRelayReceipt(txReceipt);
    assert.isTrue(success, `toggleRegistry failed with "${error}"`);
    assert.isTrue(await dappRegistry.isEnabledRegistry(wallet.address, CUSTOM_REGISTRY_ID));
    console.log("Gas to call toggleRegistry: ", txReceipt.gasUsed);
  }
  async function setupWallet() {
    const walletAddress = await utils.createWallet(factory.address, owner, [module.address])
    wallet = await BaseWallet.at(walletAddress);
    const decimals = 12
    erc20 = await ERC20.new([infrastructure, wallet.address], 10000000, decimals); // TOKN contract with 10M tokens (5M TOKN for wallet and 5M TOKN for account[0])
    await wallet.send(new BN("1000000000000000000"));

    const txReceipt = await manager.relay(module, "addToWhitelist", [wallet.address, dappRegistry.address], wallet, [owner]);
    const { success, error } = await utils.parseRelayReceipt(txReceipt);
    assert.isTrue(success, `adding dapp registry to whitelist failed with "${error}"`);
    await utils.increaseTime(SECURITY_PERIOD + 1);

    await enableCustomRegistry();
  }
  beforeEach(async () => {
    await setupRegistries()
  })

  // describe("call (un)authorised contract", () => {
  //   beforeEach(async () => {
  //     await setupWallet();
  //     await utils.initNonce(owner, wallet, module, manager, SECURITY_PERIOD)
  //   })
  //   it(" send ETH to authorised address", async () => {
  //       const transaction = utils.encodeTransaction(recipient, 100, ZERO_BYTES);
  //       const txReceipt = await manager.relay(
  //         module,
  //         "multiCall",
  //         [wallet.address, [transaction]],
  //         wallet,
  //         [owner],
  //         10,
  //         ETH_TOKEN,
  //         relayer);
  //       const success = await utils.parseRelayReceipt(txReceipt).success;
  //       assert.isTrue(success);
  //       console.log("Gas to send ETH: ", txReceipt.gasUsed);
  //     });
  //     it("call authorised contract when filter passes", async () => {
  //       const data = contract.contract.methods.setState(4).encodeABI();
  //       const transaction = utils.encodeTransaction(contract.address, 0, data);

  //       const txReceipt = await manager.relay(
  //         module,
  //         "multiCall",
  //         [wallet.address, [transaction]],
  //         wallet,
  //         [owner],
  //         10,
  //         ETH_TOKEN,
  //         recipient);
  //       const success = await utils.parseRelayReceipt(txReceipt).success;
  //       assert.isTrue(success);
  //       assert.equal(await contract.state(), 4);
  //       console.log("Gas to call contract: ", txReceipt.gasUsed);
  //     });

  //     it("call authorised contract when filter passes (community registry)", async () => {
  //       const data = contract2.contract.methods.setState(4).encodeABI();
  //       const transaction = utils.encodeTransaction(contract2.address, 0, data);

  //       const txReceipt = await manager.relay(
  //         module,
  //         "multiCall",
  //         [wallet.address, [transaction]],
  //         wallet,
  //         [owner],
  //         10,
  //         ETH_TOKEN,
  //         relayer);
  //       const success = await utils.parseRelayReceipt(txReceipt).success;
  //       assert.isTrue(success);
  //       assert.equal(await contract.state(), 4);
  //       console.log("Gas to call contract: ", txReceipt.gasUsed);
  //     });

  //   it("should block call to authorised contract when filter doesn't pass", async () => {
  //     const data = contract.contract.methods.setState(5).encodeABI();
  //     const transaction = utils.encodeTransaction(contract.address, 0, data);

  //     const txReceipt = await manager.relay(
  //       module,
  //       "multiCall",
  //       [wallet.address, [transaction]],
  //       wallet,
  //       [owner],
  //       10,
  //       ETH_TOKEN,
  //       relayer);
  //     const { success, error } = await utils.parseRelayReceipt(txReceipt);
  //     assert.isFalse(success);
  //     assert.equal(error, "call not authorised");
  //   });

  //   it("should not send ETH to unauthorised address", async () => {
  //     const transaction = utils.encodeTransaction(nonwhitelisted, 100, ZERO_BYTES);

  //     const txReceipt = await manager.relay(
  //       module,
  //       "multiCall",
  //       [wallet.address, [transaction]],
  //       wallet,
  //       [owner],
  //       10,
  //       ETH_TOKEN,
  //       relayer);
  //     const { success, error } = await utils.parseRelayReceipt(txReceipt);
  //     assert.isFalse(success);
  //     assert.equal(error, "call not authorised");
  //   });
  // })
  // describe("approve token and call authorised contract", () => {
  //   beforeEach(async () => {
  //     await setupWallet();
  //     await utils.initNonce(owner, wallet, module, manager, SECURITY_PERIOD);
  //   });

  //   it("should call authorised contract when filter pass", async () => {
  //     const transactions = [];

  //     let data = erc20.contract.methods.approve(contract.address, 100).encodeABI();
  //     let transaction = utils.encodeTransaction(erc20.address, 0, data);
  //     transactions.push(transaction);

  //     data = contract.contract.methods.setStateAndPayToken(4, erc20.address, 100).encodeABI();
  //     transaction = utils.encodeTransaction(contract.address, 0, data);
  //     transactions.push(transaction);

  //     const txReceipt = await manager.relay(
  //       module,
  //       "multiCall",
  //       [wallet.address, transactions],
  //       wallet,
  //       [owner],
  //       10,
  //       ETH_TOKEN,
  //       relayer);
  //     const success = await utils.parseRelayReceipt(txReceipt).success;
  //     assert.isTrue(success);
  //     assert.equal(await contract.state(), 4);
  //     console.log("Gas to approve token and call contract: ", txReceipt.gasUsed);
  //   });

  //   it("should block call to authorised contract when filter doesn't pass", async () => {
  //     const transactions = [];

  //     let data = erc20.contract.methods.approve(contract.address, 100).encodeABI();
  //     let transaction = utils.encodeTransaction(erc20.address, 0, data);
  //     transactions.push(transaction);

  //     data = contract.contract.methods.setStateAndPayToken(5, erc20.address, 100).encodeABI();
  //     transaction = utils.encodeTransaction(contract.address, 0, data);
  //     transactions.push(transaction);

  //     const txReceipt = await manager.relay(
  //       module,
  //       "multiCall",
  //       [wallet.address, transactions],
  //       wallet,
  //       [owner],
  //       10,
  //       ETH_TOKEN,
  //       relayer);
  //     const { success, error } = await utils.parseRelayReceipt(txReceipt);
  //     assert.isFalse(success);
  //     assert.equal(error, "call not authorised");
  //   });
  // });

  // describe("enable/disable registry for wallet", () => {
  //   beforeEach(async () => {
  //     await setupWallet();
  //   });

  //   it("should allow disabling the Argent Registry", async () => {
  //     const assertToggle = async (enable) => {
  //       const toggle = utils.encodeCalls([[dappRegistry, "toggleRegistry", [0, enable]]]);
  //       const txReceipt = await manager.relay(
  //         module, "multiCall", [wallet.address, toggle], wallet, [owner]);
  //       const { success, error } = await utils.parseRelayReceipt(txReceipt);
  //       assert.isTrue(success, `toggleRegistry failed with "${error}"`);
  //     };
  //     assert.isTrue(await dappRegistry.isEnabledRegistry(wallet.address, 0));
  //     await assertToggle(false);
  //     assert.isFalse(await dappRegistry.isEnabledRegistry(wallet.address, 0));
  //     await assertToggle(true);
  //     assert.isTrue(await dappRegistry.isEnabledRegistry(wallet.address, 0));
  //   });

  //   it("should not enable non-existing registry", async () => {
  //     const data = dappRegistry.contract.methods.toggleRegistry(66, true).encodeABI();
  //     const transaction = utils.encodeTransaction(dappRegistry.address, 0, data);
  //     const txReceipt = await manager.relay(
  //       module,
  //       "multiCall",
  //       [wallet.address, [transaction]],
  //       wallet,
  //       [owner]);
  //     const { success, error } = await utils.parseRelayReceipt(txReceipt);
  //     assert.isFalse(success);
  //     assert.equal(error, "unknown registry");
  //   });
  // });

  // describe("add registry", () => {
  //   it("should not create a duplicate registry", async () => {
  //     await truffleAssert.reverts(
  //       dappRegistry.createRegistry(CUSTOM_REGISTRY_ID, registryOwner, { from: infrastructure }), "duplicate registry"
  //     );
  //   });
  //   it("should not create a registry without owner", async () => {
  //     await truffleAssert.reverts(
  //       dappRegistry.createRegistry(CUSTOM_REGISTRY_ID, ZERO_ADDRESS, { from: infrastructure }), "registry owner is address(0)"
  //     );
  //   });
  // });

  // describe("owner change", () => {
  //   it("changes a registry owner", async () => {
  //     await dappRegistry.changeOwner(0, recipient);
  //     let regOwner = await dappRegistry.registryOwners(0, { from: infrastructure });
  //     assert.equal(regOwner, recipient);
  //     await dappRegistry.changeOwner(0, infrastructure, { from: recipient });
  //     regOwner = await dappRegistry.registryOwners(0);
  //     assert.equal(regOwner, infrastructure);
  //   });

  //   it("can't change a registry to null owner", async () => {
  //     await truffleAssert.reverts(
  //       dappRegistry.changeOwner(0, ZERO_ADDRESS, { from: infrastructure }), "new registryOwner is address(0)"
  //     );
  //   });
  // });

  describe("timelock change", () => {
    it("can change the timelock", async () => {
      const tl = (await dappRegistry.timelockPeriod()).toNumber();
      const requestedTl = 12;
      await dappRegistry.requestTimelockChange(requestedTl, { from: infrastructure });
      await truffleAssert.reverts(
        dappRegistry.confirmTimelockChange(), "is not time to change timelock"
      );
      let newTl = (await dappRegistry.timelockPeriod()).toNumber();
      assert.equal(newTl, tl);
      await utils.increaseTime(SECURITY_PERIOD);
      await dappRegistry.confirmTimelockChange();
      newTl = (await dappRegistry.timelockPeriod()).toNumber();
      assert.equal(newTl, requestedTl);

      await dappRegistry.requestTimelockChange(tl, { from: infrastructure });
      await utils.increaseTime(newTl);
    });
  });

  // describe("add/remove dapp", () => {
  //   it("should allow registry owner to add a dapp", async () => {
  //     const { validAfter } = await dappRegistry.getAuthorisation(0, contract2.address);
  //     assert.equal(validAfter.toNumber(), 0);
  //     await dappRegistry.addDapp(0, contract2.address, ZERO_ADDRESS, { from: infrastructure });
  //     const { validAfter: validAfter2 } = await dappRegistry.getAuthorisation(0, contract2.address);
  //     assert.isTrue(validAfter2.gt(0));
  //   });
  //   it("should not allow registry owner to add duplicate dapp", async () => {
  //     await dappRegistry.addDapp(0, contract2.address, filter.address, { from: infrastructure });
  //     await truffleAssert.reverts(
  //       dappRegistry.addDapp(0, contract2.address, filter.address, { from: infrastructure }), "dapp already added"
  //     );
  //   });
  //   it("should not allow non-owner to add authorisation to the Argent registry", async () => {
  //     await truffleAssert.reverts(
  //       dappRegistry.addDapp(0, contract2.address, filter.address, { from: nonwhitelisted }), "sender != registry owner"
  //     );
  //   });
  //   it("should not allow adding authorisation to unknown registry", async () => {
  //     await truffleAssert.reverts(
  //       dappRegistry.addDapp(66, contract2.address, filter.address, { from: nonwhitelisted }), "unknown registry"
  //     );
  //   });
  //   it("should allow registry owner to remove a dapp (no pending filter update)", async () => {
  //     await truffleAssert.reverts(
  //       dappRegistry.removeDapp(0, contract2.address, { from: infrastructure }), "unknown dapp"
  //     );
  //     await dappRegistry.addDapp(0, contract2.address, ZERO_ADDRESS, { from: infrastructure });
  //     await dappRegistry.removeDapp(0, contract2.address, { from: infrastructure });
  //     const { validAfter } = await dappRegistry.getAuthorisation(0, contract2.address);
  //     assert.equal(validAfter.toNumber(), 0);
  //   });
  //   it("should allow registry owner to remove a dapp (with pending filter update)", async () => {
  //     await dappRegistry.addDapp(0, contract2.address, ZERO_ADDRESS, { from: infrastructure });
  //     await dappRegistry.requestFilterUpdate(0, contract2.address, filter2.address, { from: infrastructure });
  //     await dappRegistry.removeDapp(0, contract2.address, { from: infrastructure });
  //     const { validAfter } = await dappRegistry.getAuthorisation(0, contract2.address);
  //     assert.equal(validAfter.toNumber(), 0);
  //     const pendingAuth = await dappRegistry.pendingFilterUpdates(0, contract2.address);
  //     assert.equal(pendingAuth, 0);
  //   });
  // });

  // describe("update filter", () => {
  //   it("should allow registry owner to change an existing filter", async () => {
  //     await dappRegistry.addDapp(0, contract2.address, filter.address, { from: infrastructure });
  //     const { filter: filter_ } = await dappRegistry.getAuthorisation(0, contract2.address);
  //     assert.equal(filter_, filter.address);
  //     await dappRegistry.requestFilterUpdate(0, contract2.address, filter2.address, { from: infrastructure });
  //     await truffleAssert.reverts(
  //       dappRegistry.confirmFilterUpdate(0, contract2.address, { from: infrastructure }),
  //       "too early to confirm auth"
  //     );
  //     const tl = (await dappRegistry.timelockPeriod()).toNumber();
  //     await utils.increaseTime(tl + 1);
  //     await dappRegistry.confirmFilterUpdate(0, contract2.address, { from: infrastructure });
  //     const { filter: filter2_ } = await dappRegistry.getAuthorisation(0, contract2.address);
  //     assert.equal(filter2_, filter2.address);
  //   });
  //   it("should not allow changing filter for a non-existing dapp", async () => {
  //     await truffleAssert.reverts(
  //       dappRegistry.requestFilterUpdate(0, contract2.address, filter.address, { from: infrastructure }),
  //       "unknown dapp"
  //     );
  //   });
  //   it("should not allow confirming change of a non-existing pending change", async () => {
  //     await truffleAssert.reverts(
  //       dappRegistry.confirmFilterUpdate(0, contract2.address, { from: infrastructure }),
  //       "no pending filter update"
  //     );
  //   });
  // });
})
