const { ethers } = require("hardhat");

// const ethers = require("ethers");
const { expect, util } = require("chai");
const { config } = require("hardhat")
const utils = require("../utils/utilities.js");
const { ETH_TOKEN } = require("../utils/utilities.js");

const BaseWallet = artifacts.require('BaseWallet');
const TestContrat = artifacts.require('TestWalletExecute')
const ERC20 = artifacts.require("TestERC20");

const RelayManager = require("../utils/relay-manager.js");
const { BigNumber } = require("ethers");

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
    async function relay(_basewallet, _method, _params) {
        console.log(_basewallet.contract.methods)
        // console.log(_basewallet.contract)

        // console.log(tx)
        return tx.receipt;
    }

    describe("TestWalletExecute", () => {
        it("TestWalletExecute", async () => {
            const guardianStorage = await deployGuardianStorage();
            const wallet1 = await deployBaseWallet()
            const wallet = await BaseWallet.at(wallet1.address)
            const walletModule = await deployWalletModule(guardianStorage)
            const modules = [walletModule.address]
            const account = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey)
            await wallet.init(account.address, modules)

            const testContract = await ethers.getContractFactory("TestWalletExecute");
            const test1 = await testContract.deploy();
            const test = await TestContrat.at(test1.address)

            console.log("account : ", account.address)
            console.log("wallet : ", wallet.address)
            // await test.add(1, 2);
            const a = BigNumber.from(2);
            const b = BigNumber.from(3);
            const c = (1, 2);
            // onsole.log(test.contract.methods["add"](...[1, 2]));
            const methodData = test.contract.methods["add"](...[1, 2]).encodeABI();
            // const methodData = test.contract.methods['getRes'](...[]).encodeABI();
            // console.log("111", methodData);
            const tx = await wallet.execute(
                test.address,
                methodData
            );
            const res = await test.getRes()
            console.log("123", res.toNumber())
            console.log("tx.receipt", tx.receipt);
            // await relay(wallet, "add",[1,2])?
        });
    });

});