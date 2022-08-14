const TestModule = artifacts.require("TestModule");
const BaseWallet = artifacts.require("BaseWallet");
/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Test Module", function (accounts) {
  const owner_1 = accounts[1];
  const module_addr_2 = accounts[4]
  let wallet_1;
  let module;
  let modules;

  before(async () => {
    module = await TestModule.new();
    modules = [module.address];
    wallet_1 = await BaseWallet.new();
    await wallet_1.init(owner_1, modules);
  });

  describe("test module active wallet", () => {
    it("add owner", async () => {
      await wallet_1.getOwners({from: module.address});
      //await wallet_1.getOwners({from: module_addr_2});
    });
    
  });
});