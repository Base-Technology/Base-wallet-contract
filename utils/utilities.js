
const ethers = require("ethers");

const utilities = {
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
        console.log("getNonceForRelay")
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
        console.log("signOffchain")
        const messageHash = utilities.getMessageHash(from, value, data, chainId, nonce, gasPrice, gasLimit, refundToken, refundAddress);
        console.log(messageHash)
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
};

module.exports = utilities;
