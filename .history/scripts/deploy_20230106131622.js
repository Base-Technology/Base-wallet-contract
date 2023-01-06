const { ethers } = require("hardhat");

async function main() {

    const SECURITY_PERIOD = 24;
    const SECURITY_WINDOW = 12;
    const LOCK_PERIOD = 24 * 5;
    const RECOVERY_PERIOD = 36;

    const signers = await ethers.getSigners();

    const guardianStorageContract = await ethers.getContractFactory("GuardianStorage");
    const guardianStorage = await guardianStorageContract.deploy();
    console.log("GuardianStorage deployed to: ", guardianStorage.address);

    const transferStorageContract = await ethers.getContractFactory("TransferStorage");
    const transferStorage = await transferStorageContract.deploy();
    console.log("TransferStorage deployed to: ", transferStorage.address);

    const walletDetectorContract = await ethers.getContractFactory("WalletDetector");
    const walletDetector = await walletDetectorContract.deploy([], []);
    console.log("WalletDetector deployed to: ", walletDetector.address);

    const baseWalletContract = await ethers.getContractFactory("BaseWallet");
    const baseWallet = await baseWalletContract.deploy();
    console.log("BaseWallet deployed to: ", baseWallet.address);

    const moduleRegistryContract = await ethers.getContractFactory("ModuleRegistry");
    const moduleRegistry = await moduleRegistryContract.deploy();
    console.log("ModuleRegistry deployed to: ", moduleRegistry.address);

    const authoriserContract = await ethers.getContractFactory("Authoriser");
    const authoriser = await authoriserContract.deploy(0);
    console.log("Authoriser deployed to: ", authoriser.address);

    const dummyUniV2RouterContract = await ethers.getContractFactory("DummyUniV2Router");
    const dummyUniV2Router = await dummyUniV2RouterContract.deploy();
    console.log("DummyUniV2Router deployed to: ", dummyUniV2Router.address);

    const factoryContract = await ethers.getContractFactory("Factory");
    const factory = await factoryContract.deploy(baseWallet.address, guardianStorage.address, signers[0].address);
    console.log("Factory deployed to: ", factory.address);

    const proxyContract = await ethers.getContractFactory("Proxy");
    const proxy = await proxyContract.deploy(baseWallet.address);
    console.log("Proxy deployed to: ", proxy.address);

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
    console.log("WalletModule deployed to: ", walletModule.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
