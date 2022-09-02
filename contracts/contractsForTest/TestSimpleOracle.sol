// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "../SimpleOracle.sol";

contract TestSimpleOracle is SimpleOracle {

    bytes32 internal creationCode;

    constructor(address _uniswapRouter) SimpleOracle(_uniswapRouter) {
        address uniswapV2Factory = IUniswapV2Router01(_uniswapRouter).factory();
        (bool success, bytes memory _res) = uniswapV2Factory.staticcall(abi.encodeWithSignature("getKeccakOfPairCreationCode()"));
        if (success) {
            creationCode = abi.decode(_res, (bytes32));
        }
    }

    function ethToToken(address _token, uint256 _ethAmount) external view returns (uint256) {
        return inToken(_token, _ethAmount);
    }

    function getPairForSorted(address tokenA, address tokenB) internal override view returns (address pair) {
        pair = address(uint160(uint256(keccak256(abi.encodePacked(
                hex'ff',
                uniswapV2Factory,
                keccak256(abi.encodePacked(tokenA, tokenB)),
                creationCode
            )))));
    }
}