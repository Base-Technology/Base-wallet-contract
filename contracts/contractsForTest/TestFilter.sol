// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/IFilter.sol";

contract TestFilter is IFilter {
    function isValid(
        address /*_wallet*/,
        address /*_spender*/,
        address /*_to*/,
        bytes calldata _data
    ) external pure override returns (bool valid) {
        uint256 state = abi.decode(_data[4:], (uint256));
        return state != 5;
    }
}
