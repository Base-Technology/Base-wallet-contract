// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;
import "./BaseModule.sol";

abstract contract RelayerManager is BaseMoudle {
    function getRequiredSignatures(address _wallet, bytes calldata _data) public view virtual returns(uint256, OwnerSignature);
}