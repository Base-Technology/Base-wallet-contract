// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract TestECDSA {
    address signer;

    function setSigner(address _signer) external {
        signer = _signer;
    }

    function verifySignature(uint256 nonce, bytes calldata signature)
        public
        view
        returns (address)
    {
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, nonce));
        bytes32 message = ECDSA.toEthSignedMessageHash(hash);
        address receivedAddress = ECDSA.recover(message, signature);
        // require(
        //     receivedAddress != address(0) && receivedAddress == signer,
        //     "wrong sign"
        // );
        return receivedAddress;
    }

    function verifySignature2(
        bytes32 _messageHash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public view returns (address) {
        address recoveredAddress = ECDSA.recover(
            _messageHash, // messageHash
            _v, // v
            _r, // r
            _s // s
        );
        // require(
        //     recoveredAddress != address(0) && recoveredAddress == signer,
        //     "wrong sign"
        // );
        return recoveredAddress;
    }
}
