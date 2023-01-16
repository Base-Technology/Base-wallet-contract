const { ethers } = require("hardhat");

// const ethers = require("ethers");
const { expect, util } = require("chai");
const { config } = require("hardhat")
const utils = require("../utils/utilities.js");
const { ETH_TOKEN } = require("../utils/utilities.js");

const WalletModule = artifacts.require('WalletModule');
const ERC20 = artifacts.require("TestERC20");

const RelayManager = require("../utils/relay-manager.js");

const ZERO_ADDRESS = ethers.constants.AddressZero;
const ZERO_BYTES = "0x";

const SECURITY_PERIOD = 2;
const SECURITY_WINDOW = 2;
const LOCK_PERIOD = 4;
const RECOVERY_PERIOD = 4;

const accounts = config.networks.hardhat.accounts;




describe("Basewallet", async function () {
    async function signRefund(wallet, amount, token, signer) {
        const message = `0x${[wallet, ethers.utils.hexZeroPad(ethers.utils.hexlify(amount), 32), token]
            .map((hex) => hex.slice(2))
            .join("")}`;
        const sig = await utils.signMessage(ethers.utils.keccak256(message), signer);
        return sig;
    }
    async function deployBaseWallet() {
        const baseWalletContract = await ethers.getContractFactory("BaseWallet");
        const baseWallet = await baseWalletContract.deploy();
        return baseWallet
    }
    async function deployGuardianStorage() {
        const guardianStorageContract = await ethers.getContractFactory("GuardianStorage");
        const guardianStorage = await guardianStorageContract.deploy();
        return guardianStorage;
    }
    async function deployWalletModule(guardianStorage) {
        const moduleRegistryContract = await ethers.getContractFactory("ModuleRegistry");
        const moduleRegistry = await moduleRegistryContract.deploy();

        const authoriserContract = await ethers.getContractFactory("Authoriser");
        const authoriser = await authoriserContract.deploy(0);

        const dummyUniV2RouterContract = await ethers.getContractFactory("DummyUniV2Router");
        const dummyUniV2Router = await dummyUniV2RouterContract.deploy();

        const transferStorageContract = await ethers.getContractFactory("TransferStorage");
        const transferStorage = await transferStorageContract.deploy();

        const walletModuleContract = await ethers.getContractFactory("WalletModule");
        const walletModule = await walletModuleContract.deploy(
            moduleRegistry.address,
            guardianStorage.address,
            transferStorage.address,
            authoriser.address,
            dummyUniV2Router.address,
            SECURITY_PERIOD,
            SECURITY_WINDOW,
            LOCK_PERIOD,
            RECOVERY_PERIOD);
        return walletModule;
    }
    async function deployFactoryFixture(guardianStorage) {
        const baseWalletContract = await ethers.getContractFactory("BaseWallet");
        const baseWallet = await baseWalletContract.deploy();

        const signers = await ethers.getSigners();
        const factoryContract = await ethers.getContractFactory("Factory");
        const factory = await factoryContract.deploy(baseWallet.address, guardianStorage.address, signers[0].address);
        return factory;
    }
    describe("test tranfer", () => {
        it("get balance", async () => {
            const guardianStorage = await deployGuardianStorage();
            const wallet = await deployBaseWallet()
            const walletModule = await deployWalletModule(guardianStorage)
            const modules = [walletModule.address]
            const payman = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
            await wallet.init(payman.address, modules)
            let owner_balance1 = await web3.eth.getBalance(wallet.address);

            await web3.eth.sendTransaction({
                from: payman.address,
                to: wallet.address,
                value: '20000000000000000000'
            });

            let owner_balance1_after = await web3.eth.getBalance(wallet.address);

            console.log(owner_balance1, owner_balance1_after);
        });
        it('test wallet to EOA', async () => {
            const wallet = await deployBaseWallet()
            const guardianStorage = await deployGuardianStorage();
            const walletModule1 = await deployWalletModule(guardianStorage)
            const walletModule = await WalletModule.at(walletModule1.address)
            const modules = [walletModule.address]
            const sigenrs = await ethers.getSigners()
            const owner = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)

            await wallet.init(owner.address, modules)
            const ERC20Contract = await ethers.getContractFactory("TestERC20")
            const account0 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
            const token1 = await ERC20Contract.deploy([account0.address], web3.utils.toWei("1000"), 18);
            const token = await ERC20.at(token1.address)
            manager = new RelayManager(guardianStorage.address, ZERO_ADDRESS);

            const recipient = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey).address
            await token.transfer(wallet.address, 100);

            await utils.addTrustedContact(owner.address, wallet, recipient, walletModule, SECURITY_PERIOD)
            let balance = await token.balanceOf(wallet.address)
            balance = balance.toNumber()
            let recipient_balance = await token.balanceOf(recipient)
            recipient_balance = recipient_balance.toNumber()
            console.log('wallet balance: ', balance)
            console.log('recipient_balance: ', recipient_balance)

            const data = token.contract.methods.transfer(recipient, 10).encodeABI()

            const transaction = utils.encodeTransaction(token.address, 0, data)

            const txReceipt = await manager.relay(walletModule, "multiCall", [wallet.address, [transaction]], wallet, [owner.address])

            balance = await token.balanceOf(wallet.address)
            balance = balance.toNumber()
            recipient_balance = await token.balanceOf(recipient)
            recipient_balance = recipient_balance.toNumber()
            console.log('wallet balance: ', balance)
            console.log('recipient_balance: ', recipient_balance)

            const { success, error } = utils.parseRelayReceipt(txReceipt)
            assert.isTrue(success)
        })
        it('test wallet to wallet', async () => {
            const wallet = await deployBaseWallet()
            const guardianStorage = await deployGuardianStorage()
            const walletModule1 = await deployWalletModule(guardianStorage)
            const walletModule = await WalletModule.at(walletModule1.address)
            const modules = [walletModule.address]
            const owner = web3.eth.accounts.privateKeyToAccount(accounts[1].privateKey)
            const owner2 = web3.eth.accounts.privateKeyToAccount(accounts[2].privateKey)
            const factorymanager = web3.eth.accounts.privateKeyToAccount(accounts[3].privateKey)
            await wallet.init(owner.address, modules)
            const ERC20Contract = await ethers.getContractFactory("TestERC20")
            const account0 = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
            token1 = await ERC20Contract.deploy([account0.address], web3.utils.toWei("1000"), 18);
            const token = await ERC20.at(token1.address)

            manager = new RelayManager(guardianStorage.address, ZERO_ADDRESS);

            await token.transfer(wallet.address, 100);


            const factory = await deployFactoryFixture(guardianStorage)

            await factory.addManager(factorymanager.address);
            const salt = utils.generateSaltValue();
            const futureAddr = await factory.getAddressForCounterfactualWallet(owner2.address, modules, salt);
            const refundAmount = 1000

            const ownerSig = await signRefund(futureAddr, refundAmount, ETH_TOKEN, owner2.address);
            const msg = ethers.utils.hexZeroPad(futureAddr, 32);
            const managerSig = await utils.signMessage(msg, factorymanager.address);

            await web3.eth.sendTransaction({ from: account0.address, to: futureAddr, value: refundAmount });

            const tx = await factory.createCounterfactualWallet(
                owner2.address,
                modules,
                salt,
                refundAmount,
                ZERO_ADDRESS,
                ownerSig,
                managerSig,
            );
            const baseWalletContract = await ethers.getContractFactory("BaseWallet");
            const wallet2 = await baseWalletContract.attach(futureAddr);

            await utils.addTrustedContact(owner.address, wallet, wallet2.address, walletModule, SECURITY_PERIOD)

            let balance = await token.balanceOf(wallet.address)
            balance = balance.toNumber()
            let recipient_balance = await token.balanceOf(wallet2.address)
            recipient_balance = recipient_balance.toNumber()
            console.log('wallet balance: ', balance)
            console.log('recipient_balance: ', recipient_balance)

            const data = token.contract.methods.transfer(wallet2.address, 10).encodeABI()
            const transaction = utils.encodeTransaction(token.address, 0, data)

            const txReceipt = await manager.relay(walletModule, "multiCall", [wallet.address, [transaction]], wallet, [owner.address])

            balance = await token.balanceOf(wallet.address)
            balance = balance.toNumber()
            recipient_balance = await token.balanceOf(wallet2.address)
            recipient_balance = recipient_balance.toNumber()
            console.log('wallet balance: ', balance)
            console.log('recipient_balance: ', recipient_balance)

            const { success, error } = utils.parseRelayReceipt(txReceipt)
            assert.isTrue(success)
        })
    });

});