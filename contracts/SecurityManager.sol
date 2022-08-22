// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "./interface/IWallet.sol";
import "./BaseModule.sol";

abstract contract SecurityManager is BaseModule {
    uint256 internal immutable securityPeriod;
    uint256 internal immutable securityWindow;
    uint256 internal immutable lockPeriod;

    constructor(uint256 _securityPeriod, uint256 _securityWindow, uint256 _lockPeriod) {
        securityPeriod = _securityPeriod;
        securityWindow = _securityWindow;
        lockPeriod = _lockPeriod;
    }

    struct GuardianManagerConfig {
        mapping(bytes32 => uint256) pending;
    }
    mapping(address => GuardianManagerConfig) internal guardianConfigs;


    modifier onlyOwnerOrSelf(address _wallet) {
        bool isSelf = (msg.sender == address(this));
        require(isOwner(_wallet,msg.sender) || isSelf, "Error:must be owner/self");
        _;
    }
    modifier onlyGuardianOrSelf(address _wallet){
        require(msg.sender == address(this) || isGuardian(_wallet, msg.sender),"Error:must be guardian/self");
        _;
    }


    function isOwner(address _wallet, address _owner) public view returns(bool) {
        return IWallet(_wallet).isOwner(_owner);
    }
    function isGuardian(address _wallet, address _guardian) public view returns (bool) {
        return guardianStorage.isGuardian(_wallet, _guardian);
    }

    function guardianCount(address _wallet) public view returns (uint256) {
        return guardianStorage.guardianCount(_wallet);
    }

    function getGuardians(address _wallet) external view returns (address[] memory) {
        return guardianStorage.getGuardians(_wallet);
    }

    function addGuardian(address _wallet, address _guardian) external onlyOwnerOrSelf(_wallet){
    // function addGuardian(address _wallet, address _guardian) external {
        require(
            !IWallet(_wallet).isOwner(_guardian),
            "Error: owner can not be a guardian"
        );
        require(!isGuardian(_wallet, _guardian), "Error:is already a guardian");

        (bool success, ) = _guardian.call{gas: 25000}(
            abi.encodeWithSignature("owner()")
        );
        require(success, "Error:must be EOA/ wallet");

        bytes32 id = keccak256(
            abi.encodePacked(_wallet, _guardian, "addition")
        );
        require(
            guardianConfigs[_wallet].pending[id] == 0 ||
                block.timestamp >
                guardianConfigs[_wallet].pending[id] + securityWindow,
            "Error:duplicate pending addition"
        );
        // uint256 count = guardianCount(_wallet);
        // if (guardianCount(_wallet) == 0) {
        //     guardianConfigs[_wallet].pending[id] = block.timestamp;
        // } else {
        guardianConfigs[_wallet].pending[id] = block.timestamp + securityPeriod;
        // }
    }
    function confirmGuardianAddition(address _wallet, address _guardian) external {
        bytes32 id = keccak256(
            abi.encodePacked(_wallet, _guardian, "addition")
        );
        require(
            guardianConfigs[_wallet].pending[id] > 0,
            "Error: no pending addition"
        );
        require(
            guardianConfigs[_wallet].pending[id] < block.timestamp,
            "Error: pending addition not over"
        );
        require(
            block.timestamp <
                guardianConfigs[_wallet].pending[id] + securityWindow,
            "Error: pending addition expired"
        );
        guardianStorage.addGuardian(_wallet, _guardian);
        delete guardianConfigs[_wallet].pending[id];
    }
    function cancelGuardianAddition(address _wallet, address _guardian) external onlyOwnerOrSelf(_wallet){
        bytes32 id = keccak256(
            abi.encodePacked(_wallet, _guardian, "addition")
        );
        require(
            guardianConfigs[_wallet].pending[id] > 0,
            "Error:no pending addition"
        );
        delete guardianConfigs[_wallet].pending[id];
    }

    function revokeGuardian(address _wallet, address _guardian) external onlyOwnerOrSelf(_wallet){
        require(isGuardian(_wallet, _guardian), "Error:is not a guardian");
        bytes32 id = keccak256(abi.encodePacked(_wallet, _guardian, "revokation"));
        require(guardianConfigs[_wallet].pending[id] == 0 || block.timestamp > guardianConfigs[_wallet].pending[id] + securityWindow,"Error:duplicate pending revoketion");
        guardianConfigs[_wallet].pending[id] = block.timestamp + securityPeriod;
    }
    function confirmGuardianRevokation(address _wallet, address _guardian) external {
        bytes32 id = keccak256(abi.encodePacked(_wallet, _guardian, "revokation"));
        require(guardianConfigs[_wallet].pending[id] > 0, "Error: no pending revokation");
        require(guardianConfigs[_wallet].pending[id] < block.timestamp, "Error: pending revokation not over");
        require(block.timestamp < guardianConfigs[_wallet].pending[id] + securityWindow, "Error:pending revokation expired");
        guardianStorage.revokeGuardian(_wallet, _guardian);
        delete guardianConfigs[_wallet].pending[id];
    }
    function cancelGuardianRevokation(address _wallet, address _guardian) external onlyOwnerOrSelf(_wallet){
        bytes32 id = keccak256(abi.encodePacked(_wallet, _guardian, "revokation"));
        require(guardianConfigs[_wallet].pending[id] > 0, "Error: no pending revokation");
        delete guardianConfigs[_wallet].pending[id];
    }

    function setLock(address _wallet, uint256 _releaseTime, bytes4 _locker) internal {
        locks[_wallet].release = uint64(_releaseTime);
        locks[_wallet].locker = _locker;
    }
    function lock(address _wallet) external onlyGuardianOrSelf(_wallet) onlyWhenUnlock(_wallet){
        setLock(_wallet, block.timestamp + lockPeriod, SecurityManager.lock.selector);
    }
    function unlock(address _wallet) external onlyGuardianOrSelf(_wallet) onlyWhenLock(_wallet){
        require(locks[_wallet].locker == SecurityManager.lock.selector,"Error: is not locker can not unlock");
        setLock(_wallet, 0, bytes4(0));
    }
    function getLock(address _wallet) external view returns(uint64){
        return _isLocked(_wallet)? locks[_wallet].release : 0;
    }
    function isLocked(address _wallet) external view returns(bool){
        return _isLocked(_wallet);
    }
    function getrelease(address _wallet) external view returns(uint64){
        return locks[_wallet].release;
    }
    function gettimestamp()external view returns(uint64){
        return uint64(block.timestamp);
    }
}
