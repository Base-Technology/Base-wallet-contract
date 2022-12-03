global.web3 = web3;
global.artifacts = artifacts;

const ethers = require("ethers");
const utils = require("../utils/utilities.js");
const RelayManager = require("../utils/relay-manager.js");

const GuardianStorage = artifacts.require("GuardianStorage");
const TransferStorage = artifacts.require("TransferStorage");
const BaseWallet = artifacts.require("BaseWallet");
const ModuleRegistry = artifacts.require("ModuleRegistry");
const WalletDetector = artifacts.require("WalletDetector");
const Authoriser = artifacts.require("Authoriser");
const DummyUniV2Router = artifacts.require("DummyUniV2Router");
const Factory = artifacts.require("Factory");
const Proxy = artifacts.require("Proxy");
const WalletModule = artifacts.require('WalletModule');
const ERC20 = artifacts.require("TestERC20");

const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;


// async function walletTransfer(walletModule, baseWallet, owner, target, value, token,manager) {
//   await utils.addTrustedContact(owner, baseWallet, target, walletModule, SECURITY_PERIOD)
//   let balance = await token.balanceOf(baseWallet.address)
//   balance = balance.toNumber()
//   let recipient_balance = await token.balanceOf(target)
//   recipient_balance = recipient_balance.toNumber()
//   console.log('wallet_1 balance: ', balance)
//   console.log('recipient_balance: ', recipient_balance)
//   const data = token.contract.methods.transfer(target, value).encodeABI()
//   const transaction = utils.encodeTransaction(token.address, 0, data)

//   const txReceipt = await manager.relay(walletModule, "multiCall", [baseWallet.address, [transaction]], baseWallet, [owner])

//   balance = await token.balanceOf(baseWallet.address)
//   balance = balance.toNumber()
//   recipient_balance = await token.balanceOf(target)
//   recipient_balance = recipient_balance.toNumber()
//   console.log('wallet_1 balance: ', balance)
//   console.log('recipient_balance: ', recipient_balance)

//   const { success, error } = utils.parseRelayReceipt(txReceipt)
//   return {success, error}
// }

// async function ownerCheck(owner, wallet){
//   let success
//   let status
//   try{
//     let isowner = await wallet.isOwner(owner)
//     console.log("1",isowner)
//     success = true
//     status= isowner
//   } catch(e){
//     success = false
//     status = e
//   }
//   return {success,status}
// }

// async function balanceCheck(wallet,token){
//   let success
//   let status
//   try{
//     let balance = await token.balanceOf(wallet)
//     console.log("2",balance)
//     success = true
//     status = balance.toNumber()
//   } catch(e){
//     success = false
//     status = e
//   }
//   return {success,status}
  

// }

module.exports = async function(deployer,network,accounts) {
    // deployment steps
    await deployer.deploy(GuardianStorage);
    await deployer.deploy(TransferStorage);
    await deployer.deploy(WalletDetector,[],[]);
    await deployer.deploy(BaseWallet);
    await deployer.deploy(ModuleRegistry);
    await deployer.deploy(Authoriser,0);
    await deployer.deploy(DummyUniV2Router);
    await deployer.deploy(Factory,BaseWallet.address, GuardianStorage.address, accounts[1]);
    await deployer.deploy(Proxy,BaseWallet.address);
    await deployer.deploy(WalletModule,ModuleRegistry.address,GuardianStorage.address, TransferStorage.address, Authoriser.address, DummyUniV2Router.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);
    // await deployer.deploy(ERC20,[accounts[0]], web3.utils.toWei("1000"), 18);
    
    // const manager = new RelayManager(GuardianStorage.address, utils.ZERO_ADDRESS);
    // const owner = accounts[2]
    // const baseWallet = await BaseWallet.new()
    // const walletModule = await WalletModule.new(ModuleRegistry.address,GuardianStorage.address, TransferStorage.address, Authoriser.address, DummyUniV2Router.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD)
    // await baseWallet.init(owner,[walletModule.address])
    // token = await ERC20.new([accounts[0]], web3.utils.toWei("1000"), 18)
    // await token.transfer(baseWallet.address, 90);
    // const tranferRes = await walletTransfer(walletModule,baseWallet,owner,accounts[3],10,token,manager)
    // console.log("tranferRes : ", tranferRes.success,tranferRes.error)

    // const ownerCheckRes = await ownerCheck(owner,baseWallet)
    // console.log("3",ownerCheckRes) 
    // console.log("ownerCheckRes : ", ownerCheckRes.success,ownerCheckRes.status)

    // const balanceCheckRes = await balanceCheck(baseWallet.address,token)
    // console.log("4",balanceCheckRes)
    // console.log("balanceCheckRes : ", balanceCheckRes.success,balanceCheckRes.status)

  };