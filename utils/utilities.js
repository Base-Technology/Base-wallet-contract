const ethers = require("ethers");
const web3 = require("web3")

const ETH_TOKEN = ethers.constants.AddressZero;
const utilities = {
    ETH_TOKEN,
    generateSaltValue: () => ethers.utils.hexZeroPad(ethers.BigNumber.from(ethers.utils.randomBytes(20)).toHexString(), 20),
    signMessage: async (message, signer) => {
        const sig = await web3.eth.sign(message, signer);
        let v = parseInt(sig.substring(130, 132), 16);
        if (v < 27) v += 27;
        const normalizedSig = `${sig.substring(0, 130)}${v.toString(16)}`;
        return normalizedSig;
    },
    getEvent: async (txReceipt, emitter, eventName) => {
        const receipt = await web3.eth.getTransactionReceipt(txReceipt.transactionHash);
        const logs = await utilities.decodeLogs(receipt.logs, emitter, eventName);
        const event = logs.find((e) => e.event === eventName);
        return event;
    },
}
module.exports = utilities;
