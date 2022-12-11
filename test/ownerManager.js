const Factory = artifacts.require('factory');
const BaseWallet = artifacts.require('BaseWallet');

contract("basewallet", function (accounts) {
    const owner_1 = accounts[1];
    const owner_2 = accounts[2];
    const owner_3 = accounts[3];
    const owner_4 = accounts[4];
    const owner_5 = accounts[5];
    const owner_6 = accounts[6];
    const owner_7 = accounts[7];
    
    const module = accounts[5];
    let wallet_1;
    let wallet_2
    let modules;
  
    before(async () => {
      modules = [module];
      wallet_1 = await BaseWallet.new();
      wallet_2 = await BaseWallet.new();
      await wallet_1.init(owner_1, modules); 
      await wallet_2.init(owner_5, modules)
    });
  
    describe("test ownerManager", () => {
      it("add owner", async () => {
        
        await wallet_1.addOwner(owner_2);
        let isOwner21 = await wallet_1.isOwner(owner_2)
        let isOwner22 = await wallet_2.isOwner(owner_2)
        console.log('isOwner1',isOwner21,isOwner22)
        
        await wallet_1.addOwner(owner_3);
        let isOwner31 = await wallet_1.isOwner(owner_3)
        let isOwner32 = await wallet_2.isOwner(owner_3)
        console.log('isOwner1',isOwner31,isOwner32)

        let owners = await wallet_1.getOwners()
        console.log('owners of wallet_1:')
        console.log(owners)

        await wallet_2.addOwner(owner_6);
        let isOwner61 = await wallet_1.isOwner(owner_6)
        let isOwner62 = await wallet_2.isOwner(owner_6)
        console.log('isOwner1',isOwner61,isOwner62)
        
        await wallet_2.addOwner(owner_7);
        let isOwner71 = await wallet_1.isOwner(owner_7)
        let isOwner72 = await wallet_2.isOwner(owner_7)
        console.log('isOwner1',isOwner71,isOwner72)

        let owners2 = await wallet_2.getOwners()
        console.log('owners of wallet_2:')
        console.log(owners2)
      });
      it("delete owner", async () => {

        await wallet_1.deleteOwner(owner_2)
        isOwner = await wallet_1.isOwner(owner_2)
        console.log('isOwner1',isOwner)
        owners = await wallet_1.getOwners()
        console.log(owners)
        await wallet_1.deleteOwner(owner_3)
        isOwner = await wallet_1.isOwner(owner_3)
        console.log('isOwner1',isOwner)
        owners = await wallet_1.getOwners()
        console.log(owners)
      })
      it("change owner", async () => {
        
        await wallet_1.addOwner(owner_2);
        await wallet_1.addOwner(owner_3);
        let owners = await wallet_1.getOwners()
        console.log('owners:')
        console.log(owners)
        await wallet_1.changeOwner(owner_1,owner_4);
        
        isOwner = await wallet_1.isOwner(owner_1)
        console.log('isOwner1',isOwner)
        
        isOwner = await wallet_1.isOwner(owner_4)
        console.log('isOwner4',isOwner)
        owners = await wallet_1.getOwners()
        console.log('owners:')
        console.log(owners)
      })
    });
  
  });
  