const { ethers } = require("hardhat");

// const ethers = require("ethers");
const { expect, util } = require("chai");
const {config}   = require("hardhat")
const utils = require("../utils/utilities.js");
const { ETH_TOKEN } = require("../utils/utilities.js");
// const Web3 = require("web3")
// const web3 = new Web3( );

const ZERO_ADDRESS = ethers.constants.AddressZero;
const ZERO_BYTES = "0x";

const SECURITY_PERIOD = 2;
const SECURITY_WINDOW = 2;
const LOCK_PERIOD = 4;
const RECOVERY_PERIOD = 4;
const accounts = config.networks.hardhat.accounts;