
const ethers = require("ethers");
const BN = require("bn.js");
const Factory = artifacts.require("Factory");


const ETH_TOKEN = ethers.constants.AddressZero;
const ZERO_BYTES = "0x";



const utilities = {
    ETH_TOKEN,
    increaseTime: async (seconds) => {
        const client = await utilities.web3GetClient();
        if (!client.includes("TestRPC")) {
            console.warning("client is not ganache-cli and can not forward time")
        } else {
            await utilities.evmIncreaseTime(seconds);
            await utilities.evmMine();
        }
    },
    web3GetClient: async () => new Promise((resolve, reject) => {
        web3.eth.getNodeInfo((err, res) => {
            if (err !== null) return reject(err);
            return resolve(res);
        });
    }),
    evmIncreaseTime: (seconds) => new Promise((resolve, reject) => web3.currentProvider.send(
        {
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [seconds],
            id: 0,
        },
        (err, res) => (err ? reject(err) : resolve(res)))
    ),

    evmMine: () => new Promise((resolve, reject) => web3.currentProvider.send(
        {
            jsonrpc: "2.0",
            method: "evm_mine",
            params: [],
            id: 0,
        },
        (err, res) => (err ? reject(err) : resolve(res))
    )),

    getNamedAccounts: async (accounts) => {
        const addresses = accounts || await web3.eth.getAccounts();
        const [infrastructure, owner, guardian1, relayer, tokenHolder, refundAddress, ...freeAccounts] = addresses;
        return { infrastructure, owner, guardian1, relayer, tokenHolder, refundAddress, freeAccounts };
    },
    getNonceForRelay: async () => {
        const block = await web3.eth.getBlockNumber();
        const timestamp = new Date().getTime();
        return `0x${ethers.utils.hexZeroPad(ethers.utils.hexlify(block), 16)
            .slice(2)}${ethers.utils.hexZeroPad(ethers.utils.hexlify(timestamp), 16).slice(2)}`;
    },
    getChainId: async () => {
        const chainId = await web3.eth.getChainId()
        return chainId
    },
    signOffchain: async (signers, from, value, data, chainId, nonce, gasPrice, gasLimit, refundToken, refundAddress) => {
        const messageHash = utilities.getMessageHash(from, value, data, chainId, nonce, gasPrice, gasLimit, refundToken, refundAddress);
        const signatures = await Promise.all(
            signers.map(async (signer) => {
                const sig = await utilities.signMessage(messageHash, signer);
                return sig.slice(2);
            })
        );
        const joinedSignatures = `0x${signatures.join("")}`;

        return joinedSignatures;
    },
    getMessageHash: (from, value, data, chainId, nonce, gasPrice, gasLimit, refundToken, refundAddress) => {
        const message = `0x${[
            "0x19",
            "0x00",
            from,
            ethers.utils.hexZeroPad(ethers.utils.hexlify(value), 32),
            data,
            ethers.utils.hexZeroPad(ethers.utils.hexlify(chainId), 32),
            nonce,
            ethers.utils.hexZeroPad(ethers.utils.hexlify(gasPrice), 32),
            ethers.utils.hexZeroPad(ethers.utils.hexlify(gasLimit), 32),
            refundToken,
            refundAddress,
        ].map((hex) => hex.slice(2)).join("")}`;

        const messageHash = ethers.utils.keccak256(message);
        return messageHash;
    },
    sortWalletByAddress: (wallets) => wallets.sort((s1, s2) => {
        const bn1 = ethers.BigNumber.from(s1);
        const bn2 = ethers.BigNumber.from(s2);
        if (bn1.lt(bn2)) return -1;
        if (bn1.gt(bn2)) return 1;
        return 0;
    }),
    signMessage: async (message, signer) => {
        const sig = await web3.eth.sign(message, signer);
        let v = parseInt(sig.substring(130, 132), 16);
        if (v < 27) v += 27;
        const normalizedSig = `${sig.substring(0, 130)}${v.toString(16)}`;
        return normalizedSig;
    },
    createWallet: async (factoryAddress, owner, modules) => {
        console.log('--> generateSaltValue')
        const salt = utilities.generateSaltValue();
        const managerSig = "0x";
        const factory = await Factory.at(factoryAddress);

        const tx = await factory.createCounterfactualWallet(
            owner, modules, salt, 0, ethers.constants.AddressZero, ZERO_BYTES, managerSig);

        console.log('--> getEvent')
        const event = await utilities.getEvent(tx.receipt, factory, "WalletCreated");
        return event.args.wallet;
    },
    generateSaltValue: () => ethers.utils.hexZeroPad(ethers.BigNumber.from(ethers.utils.randomBytes(20)).toHexString(), 20),
    getEvent: async (txReceipt, emitter, eventName) => {
        const receipt = await web3.eth.getTransactionReceipt(txReceipt.transactionHash);
        const logs = await utilities.decodeLogs(receipt.logs, emitter, eventName);
        const event = logs.find((e) => e.event === eventName);
        return event;
    },
    parseRelayReceipt: (txReceipt) => {
        const { args } = txReceipt.logs.find((e) => e.event === "TransactionExecuted");

        let errorBytes;
        let error;
        if (!args.success && args.returnData) {
            if (args.returnData.startsWith("0x08c379a0")) {
                // Remove the encoded error signatures 08c379a0
                const noErrorSelector = `0x${args.returnData.slice(10)}`;
                const errorBytesArray = ethers.utils.defaultAbiCoder.decode(["bytes"], noErrorSelector);
                errorBytes = errorBytesArray[0]; // eslint-disable-line prefer-destructuring
            } else {
                errorBytes = args.returnData; console.log(errorBytes);
            }
            error = ethers.utils.toUtf8String(errorBytes);
        }
        return { success: args.success, error };
    },
    decodeLogs: (logs, emitter, eventName) => {
        let address;
    
        const { abi } = emitter;
        try {
          address = emitter.address;
        } catch (e) {
          address = null;
        }
    
        const eventABIs = abi.filter((x) => x.type === "event" && x.name === eventName);
        if (eventABIs.length === 0) {
          throw new Error(`No ABI entry for event '${eventName}'`);
        } else if (eventABIs.length > 1) {
          throw new Error(`Multiple ABI entries for event '${eventName}', only uniquely named events are supported`);
        }
    
        const [eventABI] = eventABIs;
    
        // The first topic will equal the hash of the event signature
        const eventSignature = `${eventName}(${eventABI.inputs.map((input) => input.type).join(",")})`;
        const eventTopic = web3.utils.sha3(eventSignature);
    
        // Only decode events of type 'EventName'
        return logs
          .filter((log) => log.topics.length > 0 && log.topics[0] === eventTopic && (!address || log.address === address))
          .map((log) => web3.eth.abi.decodeLog(eventABI.inputs, log.data, log.topics.slice(1)))
          .map((decoded) => ({ event: eventName, args: decoded }));
      },
      sha3: (input) => {
        if (ethers.utils.isHexString(input)) {
          return ethers.utils.keccak256(input);
        }
        return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(input));
      },
      getBalance: async (account) => {
        const balance = await web3.eth.getBalance(account);
        return new BN(balance);
      },
};

module.exports = utilities;
