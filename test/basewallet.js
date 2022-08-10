
const ethers = require("ethers");

const BaseWallet = artifacts.require("BaseWallet");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("basewallet", function (accounts) {
  const owner_1 = accounts[1];
  const owner_2 = accounts[2];
  const owner_3 = accounts[3];
  const payman = accounts[5];
  const module = accounts[4]
  let wallet_1;
  let wallet_2;
  let wallet_3;
  let modules;

  before(async () => {
    modules = [module];
    wallet_1 = await BaseWallet.new();
    await wallet_1.init(owner_1, modules);
    // wallet_2 = await BaseWallet.new();
    // await wallet_2.init(owner_2, modules);
    // wallet_3 = await BaseWallet.new();
    // await wallet_3.init(owner_3, modules);
    
  });

  describe("test tranfer", () => {
    it("get balance", async () => {
      let owner_balance1 = await web3.eth.getBalance(wallet_1.address);
      //let owner_balance2 = await web3.eth.getBalance(wallet_2.address);
      //let owner_balance3 = await web3.eth.getBalance(wallet_3.address);
      await web3.eth.sendTransaction({
        from:payman,
        to:wallet_1.address,
        value:'1000000000000000000'
      });
      //await wallet_1.send(1000000000000000000);
      let owner_balance1_after = await web3.eth.getBalance(wallet_1.address);

      console.log(owner_balance1, owner_balance1_after);
    });
  });

});
