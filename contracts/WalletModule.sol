// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "./BaseModule.sol";
import "./SecurityManager.sol";
import "./RelayerManager.sol";
import "./Utils.sol";

contract WalletModule is BaseModule, SecurityManager, RelayerManager {
    constructor(
        IGuardianStorage _guardianStorage,
        uint256 _securityPeriod,
        uint256 _securityWindow,
        uint256 _lockPeriod,
        uint256 _recoveryPeriod
    )
        BaseModule(_guardianStorage)
        SecurityManager(
            _securityPeriod,
            _securityWindow,
            _lockPeriod,
            _recoveryPeriod
        )
    {}

    function init(address _wallet) external override {
        uint256 a = 1;
    }

    function getRequireSignatures(address _wallet, bytes calldata _data)
        public
        view
        override
        returns (uint256, OwnerSignature)
    {
        bytes4 methodId = Utils.functionPrefix(_data);
        if (methodId == SecurityManager.executeRecovery.selector) {
            uint256 numberOfSignaturesRequired = numberOfGuardiansRequired(
                _wallet,
                1
            );
            require(
                numberOfSignaturesRequired > 0,
                "Error: no guardians on wallet"
            );
            return (numberOfSignaturesRequired, OwnerSignature.Disallowed);
        }
        if (methodId == SecurityManager.cancelRecovery.selector) {
            uint256 numberOfSignaturesRequired = numberOfGuardiansRequired(
                _wallet,
                2
            );
            return (numberOfSignaturesRequired, OwnerSignature.Optional);
        }
        if (methodId == SecurityManager.finalizeRecovery.selector) {
            return (1, OwnerSignature.Anyone);
        }
    }

    function numberOfGuardiansRequired(address _wallet, uint256 method)
        internal
        view
        returns (uint256)
    {
        uint256 count = guardianCount(_wallet);
        if (method == 2) {
            count = count + 1;
        }
        uint256 req = count / 2;
        if (count % 2 != 0) {
            req = req + 1;
        }
        return req;
    }
}
