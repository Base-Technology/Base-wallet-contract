// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "./BaseModule.sol";
import "./SecurityManager.sol";

contract WalletModule is BaseModule, SecurityManager {
    constructor(
        IGuardianStorage _guardianStorage,
        uint256 _securityPeriod,
        uint256 _securityWindow,
        uint256 _lockPeriod
    )
        BaseModule(_guardianStorage)
        SecurityManager(_securityPeriod,_securityWindow,_lockPeriod)
    {

    }

    function init(address _wallet) external override {
        uint256 a = 1;
    }
}
