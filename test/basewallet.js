
const { assert } = require("chai");
const ethers = require("ethers");
const utils = require("../utils/utilities.js");
const RelayManager = require("../utils/relay-manager.js");

const BaseWallet = artifacts.require("BaseWallet");
const GuardianStorage = artifacts.require('GuardianStorage');
const TransferStorage = artifacts.require("TransferStorage");
const Authoriser = artifacts.require("Authoriser");
const WalletModule = artifacts.require('WalletModule');
const Registry = artifacts.require("ModuleRegistry");
const UniswapV2Router01 = artifacts.require("DummyUniV2Router");
const ERC20 = artifacts.require("TestERC20");

const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;
const ZERO_ADDRESS = ethers.constants.AddressZero;

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("basewallet", function (accounts) {
  const owner_1 = accounts[1];
  const owner_2 = accounts[2];
  const owner_3 = accounts[3];
  const payman = accounts[5];
  const module = accounts[4]
  const recipient = accounts[6];
  let wallet_1;
  let wallet_2;
  let wallet_3;
  let modules;

  let walletModule
  let registry;
  let factory;
  let guardianStorage;
  let transferStorage
  let authoriser
  let walletImplementation;
  before(async () => {
    BaseWallet.defaults({from:accounts[0]})
    BaseWallet.setProvider(web3.currentProvider)
    registry = await Registry.new();
    guardianStorage = await GuardianStorage.new();
    transferStorage = await TransferStorage.new();
    authoriser = await Authoriser.new(0);

    const uniswapRouter = await UniswapV2Router01.new();

    walletModule = await WalletModule.new(registry.address,guardianStorage.address, transferStorage.address, authoriser.address, uniswapRouter.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);

    manager = new RelayManager(guardianStorage.address, ZERO_ADDRESS);
    walletImplementation = await BaseWallet.new()
    token = await ERC20.new([accounts[0]], web3.utils.toWei("1000"), 18);

    modules = [module,walletModule.address];
    wallet_1 = await BaseWallet.new();
    await wallet_1.init(owner_1, modules);

    wallet_2 = await BaseWallet.new();
    await wallet_2.init(owner_2, modules);
  });

  // beforeEach(async () => {
  //   const proxy = await Proxy.new(walletImplementation.address);
  //   wallet = await BaseWallet.at(proxy.address);
  // });

  describe("test tranfer", () => {
    it("get balance", async () => {
      let owner_balance1 = await web3.eth.getBalance(wallet_1.address);
      //let owner_balance2 = await web3.eth.getBalance(wallet_2.address);
      //let owner_balance3 = await web3.eth.getBalance(wallet_3.address);
      await web3.eth.sendTransaction({
        from: payman,
        to: wallet_1.address,
        value: '20000000000000000000'
      });
      //await wallet_1.send(1000000000000000000);
      let owner_balance1_after = await web3.eth.getBalance(wallet_1.address);

      console.log(owner_balance1, owner_balance1_after);
    });
    it('test wallet to EOA',async () => {
      let balance = await web3.eth.getBalance(wallet_1.address)
      let recipient_balance = await web3.eth.getBalance(recipient)
      console.log('wallet_1 balance: ',balance)
      console.log('recipient_balance: ',recipient_balance)
      await token.transfer(recipient, 10);
      balance = await web3.eth.getBalance(wallet_1.address)
      recipient_balance = await web3.eth.getBalance(recipient)
      console.log('wallet_1 balance: ',balance)
      console.log('recipient_balance: ',recipient_balance)

      await utils.addTrustedContact(owner_1, wallet_1, recipient, walletModule, SECURITY_PERIOD)

      const data = token.contract.methods.transfer(recipient, 10).encodeABI()
      console.log('wallet_1 balance: ',balance)
      console.log('recipient_balance: ',recipient_balance)
      const transaction = utils.encodeTransaction(token.address, 0, data)
      console.log([transaction])
      balance = await web3.eth.getBalance(wallet_1.address)
      recipient_balance = await web3.eth.getBalance(recipient)

      await token.approve(wallet_1.address,100,{from:wallet_1.address})
      const txReceipt = await manager.relay(walletModule, "multiCall", [wallet_1.address, [transaction]], wallet_1, [owner_1])
      const { success, error } = utils.parseRelayReceipt(txReceipt)
      assert.isTrue(success)
      console.log('wallet_1 balance: ',balance)
      console.log('recipient_balance: ',recipient_balance)
    })
    it('test wallet to wallet', async () => {
      let balance = await web3.eth.getBalance(wallet_1.address)
      let recipient_balance = await web3.eth.getBalance(wallet_2.address)
      console.log('wallet_1 balance: ',balance)
      console.log('recipient_balance: ',recipient_balance)
      await token.transfer(wallet_2.address, 10);
      balance = await web3.eth.getBalance(wallet_1.address)
      recipient_balance = await web3.eth.getBalance(wallet_2.address)
      console.log('wallet_1 balance: ',balance)
      console.log('recipient_balance: ',recipient_balance)

      await utils.addTrustedContact(owner_1, wallet_1, wallet_2.address, walletModule, SECURITY_PERIOD)

      const data = token.contract.methods.transfer(wallet_2.address, 10).encodeABI()
      console.log('wallet_1 balance: ',balance)
      console.log('recipient_balance: ',recipient_balance)
      const transaction = utils.encodeTransaction(token.address, 0, data)
      console.log([transaction])
      balance = await web3.eth.getBalance(wallet_1.address)
      recipient_balance = await web3.eth.getBalance(wallet_2.address)

      await token.approve(wallet_1.address,100,{from:wallet_1.address})
      const txReceipt = await manager.relay(walletModule, "multiCall", [wallet_1.address, [transaction]], wallet_1, [owner_1])
      const { success, error } = utils.parseRelayReceipt(txReceipt)
      assert.isTrue(success)
      console.log('wallet_1 balance: ',balance)
      console.log('recipient_balance: ',recipient_balance)
    })
  });

});
