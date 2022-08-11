const ethers = require("ethers");
const truffleAssert = require("truffle-assertions");

const UniswapV2Router01 = artifacts.require("DummyUniV2Router");

const Factory = artifacts.require("Factory");
const BaseWallet = artifacts.require("BaseWallet");
const ERC20 = artifacts.require("ERC20Token")

const ZERO_ADDRESS = ethers.constants.AddressZero;
const ZERO_BYTES = "0x";

const SECURITY_PERIOD = 2;
const SECURITY_WINDOW = 2;
const LOCK_PERIOD = 4;
const RECOVERY_PERIOD = 4;


/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */


contract("transfer", function (accounts) {
  console.log("account", accounts);
  const infrastructure = accounts[0];
  const owner = accounts[1]; 
  const receiver = accounts[2]

  let implementation;
  let factory;
  let modules;
  let token;

  before(async () => {
    implementation = await BaseWallet.new();
    token = await ERC20.new('ether','ETH')
  
    console.log(">>>> BaseWallet", implementation.address, await implementation.owner());
  });
  // console.log("address problem", factory.owner);
  describe("test tranfer", () => {
    it("get balance", async () => {
      let owner_balance = await web3.eth.getBalance(owner)
      let receiver_balance = await web3.eth.getBalance(receiver)
      console.log(owner_balance)
      console.log(receiver_balance)
      // await implementation.sendtoken(owner,receiver)

      await web3.eth.sendTransaction({
        from:owner,
        to:receiver,
        value:'1000000000000000000'
      })

      owner_balance = await web3.eth.getBalance(owner)
      receiver_balance = await web3.eth.getBalance(receiver)
      console.log(owner_balance)
      console.log(receiver_balance)
    });
  });
  
});
