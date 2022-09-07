const { assert } = require("chai");
const ethers = require("ethers");

const Factory = artifacts.require("Factory")
const BaseWallet = artifacts.require("BaseWallet")
const GuardianStorage = artifacts.require("GuardianStorage")
const TransferStorage = artifacts.require("TransferStorage");
const Authoriser = artifacts.require("Authoriser");
const WalletModule = artifacts.require("WalletModule")
const UniswapV2Router01 = artifacts.require("DummyUniV2Router");


const SECURITY_PERIOD = 2;
const SECURITY_WINDOW = 2;
const LOCK_PERIOD = 4;
const RECOVERY_PERIOD = 4;

const ZERO_ADDRESS = ethers.constants.AddressZero;

contract("factory",(accounts) => {
    const infrastructure = accounts[0];
    const owner = accounts[1];
    const guradian = accounts[2];
    const refundAddress = accounts[3];
    const refundAddress1 = accounts[4];

    let factory;
    let guardianStorage;
    let transferStorage
    let  authoriser
    let wallet;
    let module;
    let modules;
before(async () => {
    wallet = await BaseWallet.new();
    guardianStorage = await GuardianStorage.new();
    factory = await Factory.new(wallet.address, guardianStorage.address,refundAddress);
    await factory.addManager(infrastructure);
    
    transferStorage = await TransferStorage.new();
    authoriser = await Authoriser.new(0);
    const uniswapRouter = await UniswapV2Router01.new();

    walletModule = await WalletModule.new(guardianStorage.address, transferStorage.address, authoriser.address, uniswapRouter.address,SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);
    modules = [walletModule.address];
})
describe("create and configure", () => {
    it("create with empty WalletImplementation", async () => {
        await truffleAssert.reverts(Factory.new(ZERO_ADDRESS, guardianStorage.address, refundAddress),"WF: empty wallet implementation")
    })
    it("create with empty GuardianStorage", async () => {
        await truffleAssert.reverts(Factory.new(wallet.address, ZERO_ADDRESS, refundAddress),"WF: empty guardian storage");
    })
    it("create with empty RefundAddress", async () =>{
        await truffleAssert.reverts(Factory.new(wallet.address, guardianStorage.address, ZERO_ADDRESS),"WF: empty refund address")
    })
})
describe("change refund address", () => {
    it("change refund address", async () => {
        await factory.changeRefundAddress(refundAddress1);
        const updatedRefundAddress = await factory.refundAddress();
        assert.equal(updatedRefundAddress,refundAddress1);
    })
    it("change refund address to zero address", async () => {
        await truffleAssert.reverts(factory.changeRefundAddress(ZERO_ADDRESS),"WF: cannot set to empty")
    })
    it("non-owner change refund address",async () => {
        await truffleAssert.reverts(factory.changeRefundAddress(refundAddress1,{from:guardian}))
    })
})


})