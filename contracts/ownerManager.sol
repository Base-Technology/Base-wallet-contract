pragma solidity ^0.8.3;

contract ownerManager {
    struct ownerConfig {
        address[] owners;
        mapping(address => ownerInfo) ownersinfo;
    }
    struct ownerInfo {
        bool isOwner;
        uint256 index;
    }
    mapping(address => ownerConfig) ownersConfigs;

    // modifier onlyOwner(address _wallet, address _owner){
    //     require(isOwner(_wallet, _owner));
    //     _;
    // }
    function isOwner(address _wallet, address _owner)
        external
        view
        returns (bool)
    {
        return ownersConfigs[_wallet].ownersinfo[_owner].isOwner;
    }

    function addOwner(address _wallet, address _owner) external {
        ownerConfig storage config = ownersConfigs[_wallet];
        config.ownersinfo[_owner].isOwner = true;
        config.owners.push(_owner);
        uint256 len = config.owners.length;
        config.ownersinfo[_owner].index = uint256(len - 1);
    }

    function deleteOwner(address _wallet, address _owner) external {
        require(ownersConfigs[_wallet].ownersinfo[_owner].isOwner, "Error:is not an owner");
        uint256 index = ownersConfigs[_wallet].ownersinfo[_owner].index;
        uint len = ownersConfigs[_wallet].owners.length;
        address lastOwner = ownersConfigs[_wallet].owners[len - 1];
        if (lastOwner != _owner){
            ownersConfigs[_wallet].owners[index] = lastOwner;
            ownersConfigs[_wallet].ownersinfo[lastOwner].index = index;
        }
        ownersConfigs[_wallet].owners.pop();
        delete ownersConfigs[_wallet].ownersinfo[_owner];
    }


    function changeOwner(address _wallet, address _oldOwner,address _newOwner) external {
        require(ownersConfigs[_wallet].ownersinfo[_oldOwner].isOwner,"Error: old owner is not owner");
        require(!ownersConfigs[_wallet].ownersinfo[_newOwner].isOwner,"Error:new owner is already owner");
        uint256 index = ownersConfigs[_wallet].ownersinfo[_oldOwner].index;
        ownersConfigs[_wallet].owners[index] = _newOwner;
        ownersConfigs[_wallet].ownersinfo[_newOwner].isOwner = true;
        ownersConfigs[_wallet].ownersinfo[_newOwner].index = index;
        delete ownersConfigs[_wallet].ownersinfo[_oldOwner];
    }

    function getOwners(address _wallet)
        external
        view
        returns (address[] memory)
    {
        uint256 len = ownersConfigs[_wallet].owners.length;
        address[] memory owners = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            owners[i] = ownersConfigs[_wallet].owners[i];
        }
        return owners;
    }
}
