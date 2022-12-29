import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

import type { Authoriser__factory } from "../../types/factories/contracts/Authoriser__factory";
import type { BaseWallet__factory } from "../../types/factories/contracts/BaseWallet__factory";
import type { DummyUniV2Router__factory } from "../../types/factories/contracts/DummyUniV2Router__factory";
import type { Factory__factory } from "../../types/factories/contracts/Factory__factory";
import type { GuardianStorage__factory } from "../../types/factories/contracts/GuardianStorage__factory";
import type { ModuleRegistry__factory } from "../../types/factories/contracts/ModuleRegistry__factory";
import type { Proxy__factory } from "../../types/factories/contracts/Proxy__factory";
import type { TransferStorage__factory } from "../../types/factories/contracts/TransferStorage__factory";
import type { WalletDetector__factory } from "../../types/factories/contracts/WalletDetector.sol/WalletDetector__factory";
import type { WalletModule__factory } from "../../types/factories/contracts/WalletModule__factory";
import type { GuardianStorage } from "../../types/index";
import type { TransferStorage } from "../../types/index";
import type { WalletDetector } from "../../types/index";
import type { BaseWallet } from "../../types/index";
import type { ModuleRegistry } from "../../types/index";
import type { Authoriser } from "../../types/index";
import type { DummyUniV2Router } from "../../types/index";
import type { Factory } from "../../types/index";
import type { Proxy } from "../../types/index";
import type { WalletModule } from "../../types/index";

task("deploy:GuardianStorage").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const SECURITY_PERIOD = 24;
  const SECURITY_WINDOW = 12;
  const LOCK_PERIOD = 24 * 5;
  const RECOVERY_PERIOD = 36;

  const signers: SignerWithAddress[] = await ethers.getSigners();

  const guardianStorageFactory: GuardianStorage__factory = <GuardianStorage__factory>(
    await ethers.getContractFactory("GuardianStorage")
  );
  const guardianStorage: GuardianStorage = <GuardianStorage>await guardianStorageFactory.connect(signers[0]).deploy();
  await guardianStorage.deployed();
  console.log("GuardianStorage deployed to: ", guardianStorage.address);

  const transferStorageFactory: TransferStorage__factory = <TransferStorage__factory>(
    await ethers.getContractFactory("TransferStorage")
  );
  const transferStorage: TransferStorage = <TransferStorage>await transferStorageFactory.connect(signers[0]).deploy();
  await transferStorage.deployed();
  console.log("transferStorage deployed to: ", transferStorage.address);

  const walletDetectorFactory: WalletDetector__factory = <WalletDetector__factory>(
    await ethers.getContractFactory("WalletDetector")
  );
  const walletDetector: WalletDetector = <WalletDetector>await walletDetectorFactory.connect(signers[0]).deploy([], []);
  await walletDetector.deployed();
  console.log("walletDetector deployed to: ", walletDetector.address);

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
});
