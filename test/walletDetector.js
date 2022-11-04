const WalletDetector = artifacts.require("WalletDetector")
const Proxy = artifacts.require("Proxy")
const BaseWallet = artifacts.require("BaseWallet")

const { assert } = require("chai")
const { ethers } = require("ethers")
const truffleAssert = require("truffle-assertions");
const utils = require("../utils/utilities.js")

const RANDOM_CODE = "0x880ac7547a884027b93f5eaba5ff545919fdeb3c23ed0d2094db66303b3a80ac"
const ZERO_BYTES32 = ethers.constants.HashZero
const ZERO_ADDRESS = ethers.constants.AddressZero

const EMPTY_CODE_MSG = "empty code"
const EMPTY_IMPL_MSG = "empty implementation"

describe("WalletDetector", () => {
    let detector;
    let implementation1;
    let implementation2;
    let proxy1;
    let proxy2
    let code

    before(async function (done) {
        implementation1 = await BaseWallet.new();
        implementation2 = await BaseWallet.new();
        proxy1 = await Proxy.new(implementation1.address);
        proxy2 = await Proxy.new(implementation2.address);
        code = ethers.utils.keccak256(Proxy.deployedBytecode);
    })

    beforeEach(async () => {
        detector = await WalletDetector.new([], [])
    })

    describe("add info", () => {
        it("test before part", async () => {
            console.log("PASS");
        })
        it("deploy with codes and implementations", async () => {
            const c = [code, RANDOM_CODE]
            const i = [implementation1.address, implementation2.address]
            detector = await WalletDetector.new(c, i)
            const implementations = await detector.getImplementations()
            assert.equal(implementations[0], implementation1.address)
            assert.equal(implementations[1], implementation2.address)
            const codes = await detector.getCodes()
            assert.equal(codes[0], code)
            assert.equal(codes[1], RANDOM_CODE)
        })
        it("add implementations", async () => {
            await detector.addImplementation(implementation1.address)
            console.log(implementation1.address)
            await detector.addImplementation(implementation2.address)
            const implementations = await detector.getImplementations()
            assert.equal(implementations[0], implementation1.address)
            assert.equal(implementations[1], implementation2.address)
        })
        it("add codes", async () => {
            await detector.addCode(code)
            await detector.addCode(RANDOM_CODE)
            const codes = await detector.getCodes()
            assert.equal(codes[0], code)
            assert.equal(codes[1], RANDOM_CODE)
        })
        it("add an existing implementation", async () => {
            await detector.addImplementation(implementation1.address)
            const tx = await detector.addImplementation(implementation1.address);
            const event = await utils.getEvent(tx.receipt, detector, "AddImplementation");
            expect(event).to.not.exist;
        })
        it("should not add an existing code", async () => {
            await detector.addCode(code);
            const tx = await detector.addCode(code);
            const event = await utils.getEvent(tx.receipt, detector, "AddCode");
            expect(event).to.not.exist;
        });
        it("add an empty code", async () => {
            await truffleAssert.reverts(detector.addCode(ZERO_BYTES32), EMPTY_CODE_MSG);
          });

          it("add an empty implementation", async () => {
            await truffleAssert.reverts(detector.addImplementation(ZERO_ADDRESS), EMPTY_IMPL_MSG);
          });

          it("add code and implementation from a wallet", async () => {
            await detector.addCodeAndImplementationFromWallet(proxy1.address);
            const isWallet = await detector.isWallet(proxy1.address);
            assert.isTrue(isWallet);
          });

          it("when the code is not correct", async () => {
            await detector.addImplementation(implementation1.address);
            await detector.addCode(RANDOM_CODE);
            const isWallet = await detector.isWallet(proxy1.address);
            assert.isFalse(isWallet);
          });

          it("when the implementation is not correct", async () => {
            await detector.addImplementation(implementation1.address);
            await detector.addCode(code);
            const isWallet = await detector.isWallet(proxy2.address);
            assert.isFalse(isWallet);
          });
    })
})