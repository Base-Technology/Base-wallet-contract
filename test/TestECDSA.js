const utils = require("../utils/utilities.js");
const truffleAssert = require("truffle-assertions");
const { assert } = require("chai");
const RelayManager = require("../utils/relay-manager.js");
const { ETH_TOKEN } = require("../utils/utilities.js");
const ethers = require("ethers");
const BN = require("bn.js");
const { isBN } = require("bn.js");

const UniswapV2Router01 = artifacts.require("DummyUniV2Router");

const BaseWallet = artifacts.require('BaseWallet');
const GuardianStorage = artifacts.require('GuardianStorage');
const TransferStorage = artifacts.require("TransferStorage");
const Authoriser = artifacts.require("Authoriser");
const WalletModule = artifacts.require('WalletModule');
const ECDSA = artifacts.require('TestECDSA')


const SECURITY_PERIOD = 24;
const SECURITY_WINDOW = 12;
const LOCK_PERIOD = 24 * 5;
const RECOVERY_PERIOD = 36;

const ZERO_ADDRESS = ethers.constants.AddressZero;
contract("ECDSA", function (accounts) {
    const owner = '0x00b904b95bc4d3d78a5601488afadaa497ae2589c55755698f640590d3e5713f';
    const owner_2 = "0x355E1b96675d2c39a868649f38d7e27E89b9Bf78";
    const guardian_1 = accounts[3];
    const guardian_2 = accounts[4];
    const guardian_3 = accounts[5];
    const refundAddress = accounts[6];
    const relayer = accounts[7];

    let ecdsa
    before(async () => {
        ecdsa = await ECDSA.new()
        await ecdsa.setSigner(owner_2)
    });

    describe("test", () => {
        it("test1",async () => {
            const signature = await web3.eth.accounts.sign(
                'Hello world',
                owner
            );
            console.log(signature);
            let messageHash = signature.messageHash
            let v = signature.v;
            let r = signature.r;
            let s = signature.s;
            let addr = await ecdsa.verifySignature2(messageHash,v,r,s)
            console.log("address: ",addr)

        })
        it("test3", async () => {
            let message = ethers.utils.solidityPack(["address", "uint256"], [owner, "0"]);
            message = ethers.utils.solidityKeccak256(["bytes"], [message]);
            const signer = new ethers.Wallet(owner);
            const signature = await signer.signMessage(ethers.utils.arrayify(message));
            let addr = await ecdsa.verifySignature(0,signature)
            console.log("address: ", addr)
        })
    })
});
