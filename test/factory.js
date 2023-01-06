const { assert } = require("chai");
const ethers = require("ethers");

const utils = require("../utils/utilities.js");
const { ETH_TOKEN } = require("../utils/utilities.js");
const truffleAssert = require("truffle-assertions");

const Factory = artifacts.require("Factory")
const BaseWallet = artifacts.require("BaseWallet")
const GuardianStorage = artifacts.require("GuardianStorage")
const TransferStorage = artifacts.require("TransferStorage");
const WalletModule = artifacts.require("WalletModule")
const Registry = artifacts.require("ModuleRegistry");
const Authoriser = artifacts.require("Authoriser");
const UniswapV2Router01 = artifacts.require("DummyUniV2Router");
const ERC20 = artifacts.require("TestERC20");

const SECURITY_PERIOD = 2;
const SECURITY_WINDOW = 2;
const LOCK_PERIOD = 4;
const RECOVERY_PERIOD = 4;

const ZERO_ADDRESS = ethers.constants.AddressZero;
const ZERO_BYTES = "0x";

contract("factory", (accounts) => {
    const infrastructure = accounts[0];
    const owner = accounts[1];
    const guardian = accounts[2];
    const refundAddress = accounts[3];
    const refundAddress1 = accounts[4];
    const other = accounts[5];


    let factory;
    let guardianStorage;
    let transferStorage
    let authoriser
    let registry;
    let implementation;
    let module;
    let modules;
    before(async () => {
        const uniswapRouter = await UniswapV2Router01.new();
        implementation = await BaseWallet.new();
        guardianStorage = await GuardianStorage.new();
        factory = await Factory.new(implementation.address, guardianStorage.address, refundAddress);
        authoriser = await Authoriser.new(0);
        await factory.addManager(infrastructure);
        transferStorage = await TransferStorage.new();
        registry = await Registry.new();
        walletModule = await WalletModule.new(registry.address,guardianStorage.address, transferStorage.address, authoriser.address, uniswapRouter.address, SECURITY_PERIOD, SECURITY_WINDOW, LOCK_PERIOD, RECOVERY_PERIOD);
        modules = [walletModule.address];
    })
    async function signRefund(wallet, amount, token, signer) {
        const message = `0x${[
            wallet,
            ethers.utils.hexZeroPad(ethers.utils.hexlify(amount), 32),
            token,
        ].map((hex) => hex.slice(2)).join("")}`;
        const sig = await utils.signMessage(ethers.utils.keccak256(message), signer);
        return sig;
    }

    beforeEach(async () => {
        await factory.changeRefundAddress(refundAddress);
    });

    describe("create factory", () => {
        it("create with empty WalletImplementation", async () => {
            await truffleAssert.reverts(Factory.new(ZERO_ADDRESS, guardianStorage.address, refundAddress), "WF: empty wallet implementation")
        })
        it("create with empty GuardianStorage", async () => {
            await truffleAssert.reverts(Factory.new(implementation.address, ZERO_ADDRESS, refundAddress), "WF: empty guardian storage");
        })
        it("create with empty RefundAddress", async () => {
            await truffleAssert.reverts(Factory.new(implementation.address, guardianStorage.address, ZERO_ADDRESS), "WF: empty refund address")
        })
    })
    describe("change refund address", () => {
        // beforeEach(async () => {
        //     await factory.changeRefundAddress(refundAddress);
        // });
        it("change refund address", async () => {
            await factory.changeRefundAddress(refundAddress1);
            const updatedRefundAddress = await factory.refundAddress();
            assert.equal(updatedRefundAddress, refundAddress1);
        })
        it("change refund address to zero address", async () => {
            await truffleAssert.reverts(factory.changeRefundAddress(ZERO_ADDRESS), "WF: cannot set to empty")
        })
        it("non-owner change refund address", async () => {
            await truffleAssert.reverts(factory.changeRefundAddress(refundAddress1, { from: guardian }), "Must be owner")
        })
    })
    describe("create wallet", () => {
        it("manager create wallet with the correct properties", async () => {
            const salt = utils.generateSaltValue();
            console.log(salt)
            const futureAddr = await factory.getAddressForCounterfactualWallet(owner, modules, salt);

            const managerSig = "0x";
            const tx = await factory.createCounterfactualWallet(
                owner, modules, salt, 0, ZERO_ADDRESS, ZERO_BYTES, managerSig, { from: infrastructure });
            const event = await utils.getEvent(tx.receipt, factory, "WalletCreated");
            const walletAddr = event.args.wallet;
            assert.equal(futureAddr, walletAddr);

            const wallet = await BaseWallet.at(walletAddr);
            const isOwner = await wallet.isOwner(owner)
            assert.isTrue(isOwner)

            const isAuthorised = await wallet.authorised(walletModule.address);
            assert.isTrue(isAuthorised)

            const count = await wallet.modules()
            assert.equal(count, 1)
        })
        it("createt wallet  with the correct properties", async () => {
            const salt = utils.generateSaltValue();
            const futureAddr = await factory.getAddressForCounterfactualWallet(owner, modules, salt);

            const msg = ethers.utils.hexZeroPad(futureAddr, 32);
            const managerSig = await utils.signMessage(msg, infrastructure);

            const tx = await factory.createCounterfactualWallet(
                owner, modules, salt, 0, ZERO_ADDRESS, ZERO_BYTES, managerSig, { from: owner });

            const event = await utils.getEvent(tx.receipt, factory, "WalletCreated");
            const walletAddr = event.args.wallet;
            assert.equal(futureAddr, walletAddr);
        })
        it("create with the correct static calls", async () => {
            const salt = utils.generateSaltValue();

            const futureAddr = await factory.getAddressForCounterfactualWallet(owner, modules, salt);

            const msg = ethers.utils.hexZeroPad(futureAddr, 32);
            const managerSig = await utils.signMessage(msg, infrastructure);
            const tx = await factory.createCounterfactualWallet(
                owner, modules, salt, 0, ZERO_ADDRESS, ZERO_BYTES, managerSig, { from: owner });
            const event = await utils.getEvent(tx.receipt, factory, "WalletCreated");

            const walletAddr = event.args.wallet;
            const wallet = await BaseWallet.at(walletAddr);

            const isOwner = await wallet.isOwner(owner)
            assert.isTrue(isOwner)

            const ERC1271_ISVALIDSIGNATURE_BYTES32 = utils.sha3("isValidSignature(bytes32,bytes)").slice(0, 10);
            const isValidSignatureDelegate = await wallet.enabled(ERC1271_ISVALIDSIGNATURE_BYTES32);
            assert.equal(isValidSignatureDelegate, walletModule.address);

            const ERC721_RECEIVED = utils.sha3("onERC721Received(address,address,uint256,bytes)").slice(0, 10);
            const isERC721Received = await wallet.enabled(ERC721_RECEIVED);
            assert.equal(isERC721Received, module.address);
        });
        it("in ETH when a valid signature is provided", async () => {
            const refundAmount = 1000;
            const salt = utils.generateSaltValue();
            const futureAddr = await factory.getAddressForCounterfactualWallet(owner, modules, salt);
            await web3.eth.sendTransaction({ from: infrastructure, to: futureAddr, value: refundAmount });
            const ownerSig = await signRefund(futureAddr, refundAmount, ETH_TOKEN, owner);
            const balanceBefore = await utils.getBalance(refundAddress);
            const tx = await factory.createCounterfactualWallet(
                owner, modules, salt, refundAmount, ETH_TOKEN, ownerSig, "0x");
            
            const event = await utils.getEvent(tx.receipt, factory, "WalletCreated");
            const walletAddr = event.args.wallet;
            const balanceAfter = await utils.getBalance(refundAddress);
            assert.equal(futureAddr, walletAddr);
            assert.equal(balanceAfter.sub(balanceBefore).toNumber(), refundAmount);

            assert.equal(event.args.refundToken, ETH_TOKEN);
            assert.equal(event.args.refundAmount, refundAmount);
        });
        it("in ERC20 token when a valid signature is provided", async () => {
            const refundAmount = 1000;
            const salt = utils.generateSaltValue();
            const futureAddr = await factory.getAddressForCounterfactualWallet(owner, modules, salt);
            const token = await ERC20.new([infrastructure, futureAddr], 10000000, 12);
            const ownerSig = await signRefund(futureAddr, refundAmount, token.address, owner);
            const balanceBefore = await token.balanceOf(refundAddress);
            const tx = await factory.createCounterfactualWallet(
                owner, modules, salt, refundAmount, token.address, ownerSig, "0x"
            );
            const event = await utils.getEvent(tx.receipt, factory, "WalletCreated");
            const walletAddr = event.args.wallet;

            const balanceAfter = await token.balanceOf(refundAddress);
            assert.equal(futureAddr, walletAddr, "should have the correct address");
            assert.equal(balanceAfter.sub(balanceBefore).toNumber(), refundAmount, "should have refunded in token");

            assert.equal(event.args.refundToken, token.address);
            assert.equal(event.args.refundAmount, refundAmount);
        });
        it("when an invalid refund amount is provided", async () => {
            const refundAmount = 1000;
            const salt = utils.generateSaltValue();
            const futureAddr = await factory.getAddressForCounterfactualWallet(owner, modules, salt);
            await web3.eth.sendTransaction({ from: infrastructure, to: futureAddr, value: refundAmount });
            const ownerSig = await signRefund(futureAddr, refundAmount, ETH_TOKEN, owner);
            const balanceBefore = await utils.getBalance(refundAddress);
            const tx = await factory.createCounterfactualWallet(
                owner, modules, salt, 2 * refundAmount, ETH_TOKEN, ownerSig, "0x"
            );
            const event = await utils.getEvent(tx.receipt, factory, "WalletCreated");
            const walletAddr = event.args.wallet;
            const balanceAfter = await utils.getBalance(refundAddress);
            assert.equal(futureAddr, walletAddr, "should have the correct address");
            assert.equal(balanceAfter.sub(balanceBefore), 0, "should not have refunded");
        });
        it("when a replayed owner signature is provided", async () => {
            const refundAmount = 1000;
            const salt1 = utils.generateSaltValue();
            const futureAddr1 = await factory.getAddressForCounterfactualWallet(owner, modules, salt1);
            const ownerSig = await signRefund(futureAddr1, refundAmount, ETH_TOKEN, owner);

            const salt2 = utils.generateSaltValue();
            const futureAddr2 = await factory.getAddressForCounterfactualWallet(owner, modules, salt2);
            await web3.eth.sendTransaction({ from: infrastructure, to: futureAddr2, value: refundAmount });

            const balanceBefore = await utils.getBalance(refundAddress);
            const tx2 = await factory.createCounterfactualWallet(
                owner, modules, salt2, refundAmount, ETH_TOKEN, ownerSig, "0x");
            const event = await utils.getEvent(tx2.receipt, factory, "WalletCreated");
            const walletAddr = event.args.wallet;
            assert.equal(futureAddr2, walletAddr, "should have the correct address");
            const balanceAfter = await utils.getBalance(refundAddress);
            assert.equal(balanceAfter.sub(balanceBefore), 0, "should not have refunded");
        });
        it("create a wallet at an existing address", async () => {
            const salt = utils.generateSaltValue();
            const futureAddr = await factory.getAddressForCounterfactualWallet(owner, modules, salt);
            const tx = await factory.createCounterfactualWallet(
                owner, modules, salt, 0, ZERO_ADDRESS, ZERO_BYTES, "0x"
            );
            const event = await utils.getEvent(tx.receipt, factory, "WalletCreated");
            assert.equal(futureAddr, event.args.wallet, "should have the correct address");
            await truffleAssert.reverts(
                factory.createCounterfactualWallet(owner, modules, salt, 0, ZERO_ADDRESS, ZERO_BYTES, "0x")
            );
        });
        it("when there is not enough for the refund", async () => {
            const refundAmount = 1000;
            const salt = utils.generateSaltValue();

            const futureAddr = await factory.getAddressForCounterfactualWallet(owner, modules, salt);
            
            await web3.eth.sendTransaction({ from: infrastructure, to: futureAddr, value: 900 });

            const ownerSig = await signRefund(futureAddr, refundAmount, ETH_TOKEN, owner);
            await truffleAssert.reverts(
                factory.createCounterfactualWallet(owner, modules, salt, refundAmount, ETH_TOKEN, ownerSig, "0x")
            );
        });

        it("should fail to create counterfactually when there are no modules (with guardian)", async () => {
            const salt = utils.generateSaltValue();
            await truffleAssert.reverts(
                factory.createCounterfactualWallet(
                    owner, [ethers.constants.AddressZero], salt, 0, ZERO_ADDRESS, ZERO_BYTES, "0x"
                ));
        });

        it("should fail to create when the owner is empty", async () => {
            const salt = utils.generateSaltValue();
            await truffleAssert.reverts(
                factory.createCounterfactualWallet(ZERO_ADDRESS, modules, salt, 0, ZERO_ADDRESS, ZERO_BYTES, "0x"),
                "WF: empty owner address",
            );
        });

        it("should fail to create by a non-manager without a manager's signature", async () => {
            const salt = utils.generateSaltValue();
            await truffleAssert.reverts(
                factory.createCounterfactualWallet(owner, modules, salt, 0, ZERO_ADDRESS, ZERO_BYTES, "0x", { from: other }),
                "WF: unauthorised wallet creation",
            );
        });

        it("should emit and event when the balance is non zero at creation", async () => {
            const salt = utils.generateSaltValue();
            const amount = 10000000000000;
            const futureAddr = await factory.getAddressForCounterfactualWallet(owner, modules, salt);
            await web3.eth.sendTransaction({ from: infrastructure, to: futureAddr, value: amount });
            const tx = await factory.createCounterfactualWallet(
                owner, modules, salt, 0, ZERO_ADDRESS, ZERO_BYTES, "0x"
            );
            const wallet = await BaseWallet.at(futureAddr);
            const event = await utils.getEvent(tx.receipt, wallet, "Received");
            assert.equal(event.args.value, amount, "should log the correct amount");
            assert.equal(event.args.sender, ZERO_ADDRESS, "sender should be address(0)");
        });
    })

    describe("Managed-like contract logic", () => {
        it("should not be able to revoke a manager", async () => {
            await truffleAssert.reverts(factory.revokeManager(infrastructure), "WF: Manager can not REVOKE in WF");
        });

        it("should not be able to add manager if not called by owner", async () => {
            await truffleAssert.reverts(factory.addManager(other, { from: other }), "Must be owner");
        });

        it("should not be able to set manager to zero address", async () => {
            await truffleAssert.reverts(factory.addManager(ethers.constants.AddressZero), "manager address must not be null");
        });

        it("should be able to set manager twice without error", async () => {
            await factory.addManager(other);
            let isManager = await factory.managers(other);
            assert.isTrue(isManager);

            await factory.addManager(other);
            isManager = await factory.managers(other);
            assert.isTrue(isManager);
        });
    });


})