
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
    ))
};

module.exports = utilities;
