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
// const WalletModule = artifacts.require('WalletModule');
const WalletModule = artifacts.require('testWM');

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

        guardianStorage = await GuardianStorage.new();
        transferStorage = await TransferStorage.new();
        authoriser = await Authoriser.new(0);

        const uniswapRouter = await UniswapV2Router01.new();
        console.log(4)


        walletModule = await WalletModule.new(
            guardianStorage.address, 
            transferStorage.address, 
            authoriser.address, 
            uniswapRouter.address, 
            SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);

        manager = new RelayManager(guardianStorage.address, ZERO_ADDRESS);
    });
    describe("Execute Recovery", () => {
        it("execute recovery with no guardians", async () => {
            console.log(walletModule.address);
        })
    })
});
