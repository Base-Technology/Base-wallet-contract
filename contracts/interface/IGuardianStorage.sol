// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface IGuardianStorage{
    function addGuardian(address _wallet, address _guardian) external;
    function revokeGuardian(address _wallet, address _guardian) external;
    function isGuardian(address _wallet, address _guardian) external view returns(bool);
    function getGuardians(address _wallet) external view returns(address[] memory);
    function guardianCount(address _wallet) external view returns(uint256);
}