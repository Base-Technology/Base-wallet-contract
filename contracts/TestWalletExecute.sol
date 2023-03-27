// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.4;

import "hardhat/console.sol";

contract TestWalletExecute {
    uint256 public res;
    function add(uint256 a, uint256 b)  public returns(uint256){
        address s = msg.sender;
        console.log("msg.sender : ", s);
        console.log(a+b);
        res = a+b;
        return res;
    }
    function getRes() public view returns(uint256){
        console.log("222");
        return res;
    }
}