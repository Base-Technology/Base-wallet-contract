const hre = require("hardhat");
const {
    ConfluxSDK, // The js-conflux-sdk SDK
    conflux, // The Conflux instance
} = hre;

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
    const baseWallet = await baseWalletContract.deploy([], []);
    console.log("BaseWallet deployed to: ", baseWallet.address);

    const baseWalletFactory: BaseWallet__factory = <BaseWallet__factory>await ethers.getContractFactory("BaseWallet");
        const baseWallet: BaseWallet = <BaseWallet>await baseWalletFactory.connect(signers[0]).deploy();
            await baseWallet.deployed();
            console.log("baseWallet deployed to: ", baseWallet.address);

            const moduleRegistryFactory: ModuleRegistry__factory = <ModuleRegistry__factory>(
                await ethers.getContractFactory("ModuleRegistry")
                );
                const moduleRegistry: ModuleRegistry = <ModuleRegistry>await moduleRegistryFactory.connect(signers[0]).deploy();
                    await moduleRegistry.deployed();
                    console.log("moduleRegistry deployed to: ", moduleRegistry.address);

                    const authoriserFactory: Authoriser__factory = <Authoriser__factory>await ethers.getContractFactory("Authoriser");
                        const authoriser: Authoriser = <Authoriser>await authoriserFactory.connect(signers[0]).deploy(0);
                            await authoriser.deployed();
                            console.log("authoriser deployed to: ", authoriser.address);

                            const dummyUniV2RouterFactory: DummyUniV2Router__factory = <DummyUniV2Router__factory>(
                                await ethers.getContractFactory("DummyUniV2Router")
                                );
                                const dummyUniV2Router: DummyUniV2Router = <DummyUniV2Router>(
                                    await dummyUniV2RouterFactory.connect(signers[0]).deploy()
                                    );
                                    await dummyUniV2Router.deployed();
                                    console.log("dummyUniV2Router deployed to: ", dummyUniV2Router.address);

                                    const factoryFactory: Factory__factory = <Factory__factory>await ethers.getContractFactory("Factory");
                                        const factory: Factory = <Factory>(
                                            await factoryFactory.connect(signers[0]).deploy(baseWallet.address, guardianStorage.address, signers[1].address)
                                            );
                                            await factory.deployed();
                                            console.log("factory deployed to: ", factory.address);

                                            const proxyFactory: Proxy__factory = <Proxy__factory>await ethers.getContractFactory("Proxy");
                                                const proxy: Proxy = <Proxy>await proxyFactory.connect(signers[0]).deploy(baseWallet.address);
                                                    await proxy.deployed();
                                                    console.log("proxy deployed to: ", proxy.address);

                                                    const walletModuleFactory: WalletModule__factory = <WalletModule__factory>(
                                                        await ethers.getContractFactory("WalletModule")
                                                        );
                                                        const walletModule: WalletModule = <WalletModule>(
                                                            await walletModuleFactory
                                                            .connect(signers[0])
                                                            .deploy(
                                                            moduleRegistry.address,
                                                            guardianStorage.address,
                                                            transferStorage.address,
                                                            authoriser.address,
                                                            dummyUniV2Router.address,
                                                            SECURITY_PERIOD,
                                                            SECURITY_WINDOW,
                                                            LOCK_PERIOD,
                                                            RECOVERY_PERIOD,
                                                            )
                                                            );
                                                            await walletModule.deployed();
                                                            console.log("walletModule deployed to: ", walletModule.address);
}

                                                            main()
    .then(() => process.exit(0))
    .catch((error) => {
                                                                console.error(error);
                                                            process.exit(1);
    });
