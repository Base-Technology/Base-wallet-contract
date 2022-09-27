
const ethers = require("ethers");


const ECDSA = artifacts.require('TestECDSA')

contract("ECDSA", function (accounts) {
    const privateKey = '0x4fda8f6f193101f4a013c6173ecf8e8d0c9e6fd2871b50dfcd05378a31749e56';
    const publicKey = "0x01Da66E631D01904D06f8e8E6a4b1CfCaa685F56";

    let ecdsa
    before(async () => {
        ecdsa = await ECDSA.new()
        await ecdsa.setSigner(publicKey)    
    });

    describe("test", () => {
        it("test1",async () => {
            const signature = await web3.eth.accounts.sign(
                'Hello world',
                privateKey
            );
            console.log(signature);
            let messageHash = signature.messageHash
            let v = signature.v;
            let r = signature.r;
            let s = signature.s;
            let addr = await ecdsa.verifySignature2(messageHash,v,r,s)
            

        })
        it("test3", async () => {
            let message = ethers.utils.solidityPack(["address", "uint256"], [privateKey, "0"]);
            message = ethers.utils.solidityKeccak256(["bytes"], [message]);
            const signer = new ethers.Wallet(privateKey);
            console.log(signer)
            const signature = await signer.signMessage(ethers.utils.arrayify(message));
            let addr = await ecdsa.verifySignature(0,signature)
            console.log("address: ", addr)
        })
    })
});
