// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.3;

import "./interface/IModule.sol";
import "./interface/IGuardianStorage.sol";

abstract contract BaseModule is IModule {
    address constant internal ETH_TOKEN = address(0);

    IGuardianStorage internal immutable guardianStorage;
    constructor(
        IGuardianStorage _guardianStorage
    ){
        guardianStorage = _guardianStorage;
    }

    struct Lock{
        uint64 release;
        bytes4 locker;
    }
    mapping (address => Lock) internal locks;

    modifier onlyWhenLock(address _wallet){
        require(_isLocked(_wallet),"Error:wallet is unlock");
        _;
    }
    modifier onlyWhenUnlock(address _wallet){
        require(!_isLocked(_wallet),"Error:wallet is lock");
        _;
    }

    function _isLocked(address _wallet) internal view returns(bool){
        return locks[_wallet].release > uint64(block.timestamp);
    }

}