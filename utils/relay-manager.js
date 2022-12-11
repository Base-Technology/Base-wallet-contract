const utils = require("./utilities.js");
const { ETH_TOKEN } = require("./utilities.js");
const ethers = require("ethers");
const TestSimpleOracle = artifacts.require("TestSimpleOracle");


class RelayManager {
  constructor(guardianStorage, priceOracle) {
    this.guardianStorage = guardianStorage;
    this.priceOracle = priceOracle;
  }
  async relay(_module, _method, _params, _wallet, _signers,
    _gasPrice = 0,
    _refundToken = ETH_TOKEN,
    _refundAddress = ethers.constants.AddressZero) {
    const { relayer: relayerAccount } = await utils.getNamedAccounts();
    const nonce = await utils.getNonceForRelay();
    const chainId = await utils.getChainId();
    const methodData = _module.contract.methods[_method](..._params).encodeABI();

    const gasLimit = await RelayManager.getGasLimitRefund(_module, _method, _params, _wallet, _signers, _gasPrice);

    let gasPrice = _gasPrice;
    if (_refundToken !== ETH_TOKEN) {
      gasPrice = (await (await TestSimpleOracle.at(this.priceOracle)).ethToToken(_refundToken, _gasPrice)).toNumber();
    }
    const signatures = await utils.signOffchain(
      _signers,
      _module.address,
      0,
      methodData,
      chainId,
      nonce,
      gasPrice,
      gasLimit,
      _refundToken,
      _refundAddress,
    );

    const executeData = _module.contract.methods.execute(
      _wallet.address,
      methodData,
      nonce,
      signatures,
      gasPrice,
      gasLimit,
      _refundToken,
      _refundAddress).encodeABI();    

    const nonZerosString = executeData.toString().slice(2).replace(/00(?=(..)*$)/g, "");
    const nonZeros = nonZerosString.length;
    const zeros = executeData.length - nonZeros;

    let gas = gasLimit + 21_000 + nonZeros * 16 + zeros * 4 + 70_000;

    gas += 50_000;

    if (process.env.COVERAGE) {
      gas += 50_000;
    }
    const tx = await _module.execute(
      _wallet.address,
      methodData,
      nonce,
      signatures,
      gasPrice,
      gasLimit,
      _refundToken,
      _refundAddress,
      { gas, gasPrice, from: relayerAccount },
    );
    // console.log(tx)
    return tx.receipt;
  }
  
  static async getGasLimitRefund(_module, _method, _params, _wallet, _signers, _gasPrice) {
    const requiredSigsGas = 4800;

    let nonceCheckGas = 0;
    if (_signers.length === 1) {
      nonceCheckGas = 6200;
      nonceCheckGas += 15000;
    } else if (_signers.length > 1) {
      nonceCheckGas = 22200;
    }

    let gasEstimateFeatureCall = 0;
    try {
      gasEstimateFeatureCall = await _module.contract.methods[_method](..._params).estimateGas({ from: _module.address });
      gasEstimateFeatureCall -= 21000;
    } catch (err) { // eslint-disable-line no-empty
    } finally {
      if (gasEstimateFeatureCall <= 0) {
        gasEstimateFeatureCall = 140000;
      }
    }

    let refundGas = 0;
    const methodData = _module.contract.methods[_method](..._params).encodeABI();
    const requiredSignatures = await _module.getRequiredSignatures(_wallet.address, methodData);

    if (_gasPrice > 0 && requiredSignatures[1].toNumber() === 1) {
      if (_signers.length > 1) {
        refundGas = 30000;
      } else {
        refundGas = 40000;
      }
    }

    const gasLimit = 7252 + requiredSigsGas + nonceCheckGas + (10000 * _signers.length) + gasEstimateFeatureCall + refundGas;
    return gasLimit;
  }
}
module.exports = RelayManager;