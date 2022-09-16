// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;
import "./BaseModule.sol";
import "./Utils.sol";
import "./interface/IWallet.sol";

abstract contract TransactionManager is BaseModule {
    // Static calls
    bytes4 private constant ERC1271_IS_VALID_SIGNATURE =
        bytes4(keccak256("isValidSignature(bytes32,bytes)"));
    bytes4 private constant ERC721_RECEIVED =
        bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    bytes4 private constant ERC1155_RECEIVED =
        bytes4(
            keccak256(
                "onERC1155Received(address,address,uint256,uint256,bytes)"
            )
        );
    bytes4 private constant ERC1155_BATCH_RECEIVED =
        bytes4(
            keccak256(
                "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"
            )
        );
    bytes4 private constant ERC165_INTERFACE =
        bytes4(keccak256("supportsInterface(bytes4)"));

    function supportsStaticCall(bytes4 _methodId)
        external
        pure
        override
        returns (bool _isSupported)
    {
        return
            _methodId == ERC1271_IS_VALID_SIGNATURE ||
            _methodId == ERC721_RECEIVED ||
            _methodId == ERC165_INTERFACE ||
            _methodId == ERC1155_RECEIVED ||
            _methodId == ERC1155_BATCH_RECEIVED;
    }

    function isValidSignature(bytes32 _msgHash, bytes memory _signature)
        external
        view
        returns (bytes4)
    {
        require(_signature.length == 65, "TM: invalid signature length");
        address signer = Utils.recoverSigner(_msgHash, _signature, 0);
        require(IWallet(msg.sender).isOwner(signer), "TM: Invalid signer");
        return ERC1271_IS_VALID_SIGNATURE;
    }

    function supportsInterface(bytes4 _interfaceID)
        external
        pure
        returns (bool)
    {
        return
            _interfaceID == ERC165_INTERFACE ||
            _interfaceID == (ERC1155_RECEIVED ^ ERC1155_BATCH_RECEIVED);
    }
}
