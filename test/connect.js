async function walletTransfer(walletModule, baseWallet, owner, target, value, token,manager) {
    await utils.addTrustedContact(owner, baseWallet, target, walletModule, SECURITY_PERIOD)
    let balance = await token.balanceOf(baseWallet.address)
    balance = balance.toNumber()
    let recipient_balance = await token.balanceOf(target)
    recipient_balance = recipient_balance.toNumber()
    console.log('wallet_1 balance: ', balance)
    console.log('recipient_balance: ', recipient_balance)
    const data = token.contract.methods.transfer(target, value).encodeABI()
    const transaction = utils.encodeTransaction(token.address, 0, data)
  
    const txReceipt = await manager.relay(walletModule, "multiCall", [baseWallet.address, [transaction]], baseWallet, [owner])
  
    balance = await token.balanceOf(baseWallet.address)
    balance = balance.toNumber()
    recipient_balance = await token.balanceOf(target)
    recipient_balance = recipient_balance.toNumber()
    console.log('wallet_1 balance: ', balance)
    console.log('recipient_balance: ', recipient_balance)
  
    const { success, error } = utils.parseRelayReceipt(txReceipt)
    return {success, error}
  }
  
  async function ownerCheck(owner, wallet){
    let success
    let status
    try{
      let isowner = await wallet.isOwner(owner)
      console.log("1",isowner)
      success = true
      status= isowner
    } catch(e){
      success = false
      status = e
    }
    return {success,status}
  }
  
  async function balanceCheck(wallet,token){
    let success
    let status
    try{
      let balance = await token.balanceOf(wallet)
      console.log("2",balance)
      success = true
      status = balance.toNumber()
    } catch(e){
      success = false
      status = e
    }
    return {success,status}
    
  
  }