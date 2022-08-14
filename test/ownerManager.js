const Factory = artifacts.require('factory');
const BaseWallet = artifacts.require('BaseWallet');

contract("basewallet", function (accounts) {
    const owner_1 = accounts[1];
    const owner_2 = accounts[2];
    const owner_3 = accounts[3];
    const owner_4 = accounts[4];
    const module = accounts[5];
    let wallet_1;
    let modules;
  
    before(async () => {
      modules = [module];
      wallet_1 = await BaseWallet.new();
      await wallet_1.init(owner_1, modules); 
    });
  
    describe("test ownerManager", () => {
      it("add owner", async () => {
        
        await wallet_1.addOwner(wallet_1.address,owner_2);
        let isOwner2 = await wallet_1.isOwner(wallet_1.address,owner_2)
        console.log('isOwner1',isOwner2)
        
        await wallet_1.addOwner(wallet_1.address,owner_3);
        let isOwner3 = await wallet_1.isOwner(wallet_1.address,owner_3)
        console.log('isOwner1',isOwner3)

        let owners = await wallet_1.getOwners(wallet_1.address)
        console.log('owners:')
        console.log(owners)
      });
      it("delete owner", async () => {

        await wallet_1.deleteOwner(wallet_1.address,owner_2)
        isOwner = await wallet_1.isOwner(wallet_1.address,owner_2)
        console.log('isOwner1',isOwner)
        owners = await wallet_1.getOwners(wallet_1.address)
        console.log(owners)
        await wallet_1.deleteOwner(wallet_1.address,owner_3)
        isOwner = await wallet_1.isOwner(wallet_1.address,owner_3)
        console.log('isOwner1',isOwner)
        owners = await wallet_1.getOwners(wallet_1.address)
        console.log(owners)
      })
      it("change owner", async () => {
        
        await wallet_1.addOwner(wallet_1.address,owner_2);
        await wallet_1.addOwner(wallet_1.address,owner_3);
        let owners = await wallet_1.getOwners(wallet_1.address)
        console.log('owners:')
        console.log(owners)
        await wallet_1.changeOwner(wallet_1.address,owner_1,owner_4);
        
        isOwner = await wallet_1.isOwner(wallet_1.address,owner_1)
        console.log('isOwner1',isOwner)
        
        isOwner = await wallet_1.isOwner(wallet_1.address,owner_4)
        console.log('isOwner4',isOwner)
        owners = await wallet_1.getOwners(wallet_1.address)
        console.log('owners:')
        console.log(owners)
      })
    });
  
  });
  