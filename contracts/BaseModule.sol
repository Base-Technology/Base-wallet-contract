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
}