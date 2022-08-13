pragma solidity ^0.8.3;

interface IownerManager {
    function isOwner(address _wallet, address _owner) external view returns (bool);

    function addOwner(address _wallet, address _owner) external;

    function deleteOwner(address _wallet, address _owner) external;

    function changeOwner(address _wallet, address _oldOwner,address _newOwner) external;

    function getOwners(address _wallet) external view returns (address[] memory);
}
