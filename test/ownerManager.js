const ownerManager = artifacts.require('ownerManager');
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
      ownerM = await ownerManager.new();
      await wallet_1.init(owner_1, modules); 
    });
  
    describe("test ownerManager", () => {
      it("add owner", async () => {
        await ownerM.addOwner(wallet_1.address,owner_1);
        let isOwner1 = await ownerM.isOwner(wallet_1.address,owner_1)
        console.log('isOwner1',isOwner1)
        
        await ownerM.addOwner(wallet_1.address,owner_2);
        let isOwner2 = await ownerM.isOwner(wallet_1.address,owner_2)
        console.log('isOwner1',isOwner2)
        
        await ownerM.addOwner(wallet_1.address,owner_3);
        let isOwner3 = await ownerM.isOwner(wallet_1.address,owner_3)
        console.log('isOwner1',isOwner3)

        let owners = await ownerM.getOwners(wallet_1.address)
        console.log('owners:')
        console.log(owners)
      });
      it("delete owner", async () => {
        await ownerM.deleteOwner(wallet_1.address,owner_1)
        let isOwner = await ownerM.isOwner(wallet_1.address,owner_1)
        console.log('isOwner1',isOwner)
        let owners = await ownerM.getOwners(wallet_1.address)
        console.log(owners)

        await ownerM.deleteOwner(wallet_1.address,owner_2)
        isOwner = await ownerM.isOwner(wallet_1.address,owner_2)
        console.log('isOwner1',isOwner)
        owners = await ownerM.getOwners(wallet_1.address)
        console.log(owners)
        await ownerM.deleteOwner(wallet_1.address,owner_3)
        isOwner = await ownerM.isOwner(wallet_1.address,owner_3)
        console.log('isOwner1',isOwner)
        owners = await ownerM.getOwners(wallet_1.address)
        console.log(owners)
      })
      it("change owner", async () => {
        
        await ownerM.addOwner(wallet_1.address,owner_1);
        await ownerM.addOwner(wallet_1.address,owner_2);
        await ownerM.addOwner(wallet_1.address,owner_3);
        let owners = await ownerM.getOwners(wallet_1.address)
        console.log('owners:')
        console.log(owners)

        // await ownerM.changeOwner(wallet_1.address,owner_1,owner_2);
        // await ownerM.changeOwner(wallet_1.address,owner_4,owner_1);
        await ownerM.changeOwner(wallet_1.address,owner_1,owner_4);
        
        isOwner = await ownerM.isOwner(wallet_1.address,owner_1)
        console.log('isOwner1',isOwner)
        
        isOwner = await ownerM.isOwner(wallet_1.address,owner_4)
        console.log('isOwner4',isOwner)
        owners = await ownerM.getOwners(wallet_1.address)
        console.log('owners:')
        console.log(owners)
      })
      it("test ownerManager function in basewallet", async () => {
        console.log(await wallet_1.getOwner(wallet_1.address))
        console.log(await wallet_1.checkOwner(wallet_1.address,owner_1))
        console.log(await wallet_1.checkOwner(wallet_1.address,owner_2))
        console.log(await wallet_1.checkOwner(wallet_1.address,owner_3))
        console.log(await wallet_1.checkOwner(wallet_1.address,owner_4))
        // console.log(await wallet_1.getOwner())
        // console.log(await wallet_1.checkOwner(owner_1))
        // console.log(await wallet_1.checkOwner(owner_2))
        // console.log(await wallet_1.checkOwner(owner_3))
        // console.log(await wallet_1.checkOwner(owner_4))

      })
    });
  
  });
  