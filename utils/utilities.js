const ethers = require("ethers");
// const web3 = require("web3")
const ETH_TOKEN = ethers.constants.AddressZero;
const utilities = {
  ETH_TOKEN,
  generateSaltValue: () => ethers.utils.hexZeroPad(ethers.BigNumber.from(ethers.utils.randomBytes(20)).toHexString(), 20),
  signMessage: async (message, signer) => {
    // let sig = await signer.sign(message)
    // sig = sig.signature
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

  increaseTime: async (seconds) => {
    // const client = await utilities.web3GetClient();
    // if (!client.includes("TestRPC")) {
    //   console.log("Client is not ganache-cli and cannot forward time");
    // } else {
    await utilities.evmIncreaseTime(seconds);
    await utilities.evmMine();
    // }
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
}
module.exports = utilities;
