// Sources flattened with hardhat v2.12.4 https://hardhat.org

// File contracts/lib/ERC20.sol

// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface ERC20 {
    function balanceOf(address who) external view returns (uint256);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    function approve(address spender, uint256 value) external returns (bool);
}


// File contracts/lib/ERC20Token.sol

/*

    Copyright 2017 Loopring Project Ltd (Loopring Foundation).

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
pragma solidity >=0.8.4;

/// @title ERC20 Token Implementation
/// @dev see https://github.com/ethereum/EIPs/issues/20
contract ERC20Token is ERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply_;

    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) internal allowed;

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);

    // constructor(
    //     string memory _name,
    //     string memory _symbol,
    //     uint8 _decimals,
    //     uint256 _totalSupply,
    //     address _firstHolder
    // ) {
    //     require(_totalSupply > 0);
    //     require(_firstHolder != address(0x0));
    //     // checkSymbolAndName(_symbol, _name);

    //     name = _name;
    //     symbol = _symbol;
    //     decimals = _decimals;
    //     totalSupply_ = _totalSupply;

    //     balances[_firstHolder] = totalSupply_;
    // }

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    /**
     * @dev total number of tokens in existence
     */
    function totalSupply() public view returns (uint256) {
        return totalSupply_;
    }

    /**
     * @dev transfer token for a specified address
     * @param _receiver The address to transfer to.
     * @param _value The amount to be transferred.
     */
    function transfer(address _receiver, uint256 _value) public returns (bool) {
        require(_receiver != address(0), "Error:transfer to zero address");
        require(_value <= balances[msg.sender], "Error: not enough balance");

        balances[msg.sender] = balances[msg.sender] - _value;
        balances[_receiver] = balances[_receiver] + _value;
        emit Transfer(msg.sender, _receiver, _value);
        return true;
    }

    function balanceOf(address _wallet) public view returns (uint256 balance) {
        return balances[_wallet];
    }

    /**
     * @dev Transfer tokens from one address to another
     * @param _sender address The address which you want to send tokens from
     * @param _receiver address The address which you want to transfer to
     * @param _value uint256 the amount of tokens to be transferred
     */
    function transferFrom(address _sender, address _receiver, uint256 _value) public returns (bool) {
        require(_sender != address(0), "Error:send from zero address");
        require(_sender != _receiver, "Error:send to self");
        require(_value <= balances[_sender], "Error: not enough balances");
        require(_value <= allowed[_sender][msg.sender], "Error:need to approve");

        balances[_sender] = balances[_sender] - _value;
        balances[_receiver] = balances[_receiver] + _value;
        allowed[_sender][msg.sender] = allowed[_sender][msg.sender] - _value;
        emit Transfer(_sender, _receiver, _value);
        return true;
    }

    /**
     * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
     *
     * Beware that changing an allowance with this method brings the risk that someone may use both the old
     * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
     * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     * @param _spender The address which will spend the funds.
     * @param _value The amount of tokens to be spent.
     */
    function approve(address _spender, uint256 _value) public returns (bool) {
        require(_spender != address(0), "Error:approve to the zero address");
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    /**
     * @dev Function to check the amount of tokens that an owner allowed to a spender.
     * @param _owner address The address which owns the funds.
     * @param _spender address The address which will spend the funds.
     * @return allowed uint256 specifying the amount of tokens still available for the spender.
     */
    function allowance(address _owner, address _spender) public view returns (uint256) {
        return allowed[_owner][_spender];
    }
}


// File contracts/interface/IModule.sol


pragma solidity >= 0.8.4;

interface IModule {
    function init(address _wallet) external;
    // function addModule(address _wallet, address _moduel) external;
    function supportsStaticCall(bytes4 _methodId) external view returns (bool _isSupported);
}


// File contracts/interface/IWallet.sol


pragma solidity >=0.8.4;

interface IWallet {
    /**
     * @notice Initialize a wallet
     * @param _owner The owner of the wallet
     * @param _modules the modules list to authorise
     */
    function init(address _owner, address[] calldata _modules) external;

    /**
     * @notice check if an address is an onwer
     * @param _owner the address to check
     * @return bool if the _owner is an owner
     */
    function isOwner(address _owner) external view returns (bool);

    /**
     * @notice add a new owner to a wallet
     * @param _owner the new owner address
     */
    function addOwner(address _owner) external;

    /**
     * @notice remove a new owner from a wallet
     * @param _owner the owner to remove
     */
    function deleteOwner(address _owner) external;

    /**
     * @notice  substitute new owner for old owner
     * @param _oldOwner the owner of the replacement
     * @param _newOwner the owner of substitution
     */
    function changeOwner(address _oldOwner, address _newOwner) external;

    /**
     * @notice get all the owners of the wallet
     * @return owners the owners list of the wallet
     */
    function getOwners() external view returns (address[] memory);

    function setOwnerAfterRecovery(address _newOwner) external;

    function enabled(bytes4 _sig) external view returns (address);

    function enableStaticCall(address _module, bytes4 _method) external;
}


// File contracts/BaseWallet.sol


pragma solidity >=0.8.4;




contract BaseWallet is IWallet {
    // The authorised modules
    mapping(address => bool) public authorised;
    // module executing static calls
    address public staticCallExecutor;
    // The number of modules
    uint256 public modules;

    // mapping(owner)
    address[] owners;
    mapping(address => ownerInfo) ownersinfo;
    struct ownerInfo {
        bool isOwner;
        uint256 index;
    }

    mapping(address => bool) public guardian;
    address public guardianStorage;

    event AuthorisedModule(address indexed module, bool value);
    event Received(uint256 indexed value, address indexed sender, bytes data);
    event Invoked(address indexed module, address indexed target, uint indexed value, bytes data);

    modifier moduleOnly() {
        require(authorised[msg.sender], "BW: sender not authorized");
        _;
    }

    function init(address _owner, address[] calldata _modules) external {
        require(modules == 0, "BW: wallet already initialised");
        require(_modules.length > 0, "BW: empty modules");
        ownersinfo[_owner].isOwner = true;
        ownersinfo[_owner].index = 0;
        owners.push(_owner);
        modules = _modules.length;
        for (uint256 i = 0; i < _modules.length; i++) {
            require(authorised[_modules[i]] == false, "BW: module is already added");
            authorised[_modules[i]] = true;
            // IModule(_modules[i]).init(address(this));
            emit AuthorisedModule(_modules[i], true);
        }
        if (address(this).balance > 0) {
            emit Received(address(this).balance, address(0), "");
        }
    }

    // ********** owner function ********** //
    function isOwner(address _owner) external view override returns (bool) {
        return ownersinfo[_owner].isOwner;
    }

    function addOwner(address _owner) external override {
        uint256 len = owners.length;
        require(len < 3, "Error:only can have 3 owners");
        require(!ownersinfo[_owner].isOwner, "Error:owner is already owner");
        ownersinfo[_owner].isOwner = true;
        owners.push(_owner);
        ownersinfo[_owner].index = uint256(len - 1);
    }

    function deleteOwner(address _owner) external override {
        uint256 len = owners.length;
        require(len > 1, "Error: the wallet need at least one onwer");
        require(ownersinfo[_owner].isOwner, "Error:is not an owner");
        uint256 index = ownersinfo[_owner].index;
        address lastOwner = owners[len - 1];
        if (lastOwner != _owner) {
            owners[index] = lastOwner;
            ownersinfo[lastOwner].index = index;
        }
        owners.pop();
        delete ownersinfo[_owner];
    }

    function changeOwner(address _oldOwner, address _newOwner) external override {
        require(ownersinfo[_oldOwner].isOwner, "Error: old owner is not owner");
        require(!ownersinfo[_newOwner].isOwner, "Error:new owner is already owner");
        uint256 index = ownersinfo[_oldOwner].index;
        owners[index] = _newOwner;
        ownersinfo[_newOwner].isOwner = true;
        ownersinfo[_newOwner].index = index;
        delete ownersinfo[_oldOwner];
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function setOwnerAfterRecovery(address _newOwner) external {
        delete ownersinfo[owners[0]];
        owners[0] = _newOwner;
        ownersinfo[_newOwner].isOwner = true;
        ownersinfo[_newOwner].index = 0;
        while (owners.length > 1) {
            address lastOwner = owners[owners.length - 1];
            owners.pop();
            delete ownersinfo[lastOwner];
        }
    }

    // 测试用 功能不完备
    function authoriseModule(address _module, bool _value) external {
        if (authorised[_module] != _value) {
            emit AuthorisedModule(_module, _value);
            if (_value == true) {
                modules += 1;
                authorised[_module] = true;
                //IModule(_module).init(address(this));
            } else {
                modules -= 1;
                require(modules > 0, "BW: cannot remove last module");
                delete authorised[_module];
            }
        }
    }

    /**
     * @inheritdoc IWallet
     */
    function enabled(bytes4 _sig) public view returns (address) {
        address executor = staticCallExecutor;
        if (executor != address(0) && IModule(executor).supportsStaticCall(_sig)) {
            return executor;
        }
        return address(0);
    }

    function enableStaticCall(address _module, bytes4 /* _method */) external override moduleOnly {
        if (staticCallExecutor != _module) {
            require(authorised[_module], "BW: unauthorized executor");
            staticCallExecutor = _module;
        }
    }

    /**
     * @notice Performs a generic transaction.
     * @param _target The address for the transaction.
     * @param _value The value of the transaction.
     * @param _data The data of the transaction.
     */
    function invoke(
        address _target,
        uint _value,
        bytes calldata _data
    ) external moduleOnly returns (bytes memory _result) {
        bool success;
        (success, _result) = _target.call{ value: _value }(_data);
        if (!success) {
            // solhint-disable-next-line no-inline-assembly
            assembly {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
        emit Invoked(msg.sender, _target, _value, _data);
    }

    /**
     * @notice This method delegates the static call to a target contract if the data corresponds
     * to an enabled module, or logs the call otherwise.
     */
    fallback() external payable {
        //address module = enabled(msg.sig);
        address module = staticCallExecutor;
        if (module == address(0)) {
            emit Received(msg.value, msg.sender, msg.data);
        } else {
            //require(authorised[module], "BW: unauthorised module");

            // solhint-disable-next-line no-inline-assembly
            assembly {
                calldatacopy(0, 0, calldatasize())
                let result := staticcall(gas(), module, 0, calldatasize(), 0, 0)
                returndatacopy(0, 0, returndatasize())
                switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
            }
        }
    }

    receive() external payable {}
}


// File contracts/Utils.sol


pragma solidity >=0.8.4;

/**
 * @title Utils
 * @notice Common utility methods used by modules.
 *
 *
 *
 */

library Utils {
    // ERC20, ERC721 & ERC1155 transfers & approvals
    bytes4 private constant ERC20_TRANSFER = bytes4(keccak256("transfer(address,uint256)"));
    bytes4 private constant ERC20_APPROVE = bytes4(keccak256("approve(address,uint256)"));
    bytes4 private constant ERC721_SET_APPROVAL_FOR_ALL = bytes4(keccak256("setApprovalForAll(address,bool)"));
    bytes4 private constant ERC721_TRANSFER_FROM = bytes4(keccak256("transferFrom(address,address,uint256)"));
    bytes4 private constant ERC721_SAFE_TRANSFER_FROM = bytes4(keccak256("safeTransferFrom(address,address,uint256)"));
    bytes4 private constant ERC721_SAFE_TRANSFER_FROM_BYTES =
        bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)"));
    bytes4 private constant ERC1155_SAFE_TRANSFER_FROM =
        bytes4(keccak256("safeTransferFrom(address,address,uint256,uint256,bytes)"));

    bytes4 private constant OWNER_SIG = 0x8da5cb5b;

    /**
     * @notice Helper method to recover the signer at a given position from a list of concatenated signatures.
     * @param _signedHash The signed hash
     * @param _signatures The concatenated signatures.
     * @param _index The index of the signature to recover.
     */
    function recoverSigner(bytes32 _signedHash, bytes memory _signatures, uint _index) internal pure returns (address) {
        uint8 v;
        bytes32 r;
        bytes32 s;
        // we jump 32 (0x20) as the first slot of bytes contains the length
        // we jump 65 (0x41) per signature
        // for v we load 32 bytes ending with v (the first 31 come from s) then apply a mask
        // solhint-disable-next-line no-inline-assembly
        assembly {
            r := mload(add(_signatures, add(0x20, mul(0x41, _index))))
            s := mload(add(_signatures, add(0x40, mul(0x41, _index))))
            v := and(mload(add(_signatures, add(0x41, mul(0x41, _index)))), 0xff)
        }
        require(v == 27 || v == 28, "Utils: bad v value in signature");

        address recoveredAddress = ecrecover(_signedHash, v, r, s);
        require(recoveredAddress != address(0), "Utils: ecrecover returned 0");
        return recoveredAddress;
    }

    /**
     * @notice Helper method to recover the spender from a contract call.
     * The method returns the contract unless the call is to a standard method of a ERC20/ERC721/ERC1155 token
     * in which case the spender is recovered from the data.
     * @param _to The target contract.
     * @param _data The data payload.
     */
    function recoverSpender(address _to, bytes memory _data) internal pure returns (address spender) {
        if (_data.length >= 68) {
            bytes4 methodId;
            // solhint-disable-next-line no-inline-assembly
            assembly {
                methodId := mload(add(_data, 0x20))
            }
            if (methodId == ERC20_TRANSFER || methodId == ERC20_APPROVE || methodId == ERC721_SET_APPROVAL_FOR_ALL) {
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    spender := mload(add(_data, 0x24))
                }
                return spender;
            }
            if (
                methodId == ERC721_TRANSFER_FROM ||
                methodId == ERC721_SAFE_TRANSFER_FROM ||
                methodId == ERC721_SAFE_TRANSFER_FROM_BYTES ||
                methodId == ERC1155_SAFE_TRANSFER_FROM
            ) {
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    spender := mload(add(_data, 0x44))
                }
                return spender;
            }
        }

        spender = _to;
    }

    /**
     * @notice Helper method to parse data and extract the method signature.
     */
    function functionPrefix(bytes memory _data) internal pure returns (bytes4 prefix) {
        require(_data.length >= 4, "Utils: Invalid functionPrefix");
        // solhint-disable-next-line no-inline-assembly
        assembly {
            prefix := mload(add(_data, 0x20))
        }
    }

    /**
     * @notice Checks if an address is a contract.
     * @param _addr The address.
     */
    function isContract(address _addr) internal view returns (bool) {
        uint32 size;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }

    /**
     * @notice Checks if an address is a guardian or an account authorised to
     * sign on behalf of a smart-contract guardian
     * given a list of guardians.
     * @param _guardians the list of guardians
     * @param _guardian the address to test
     * @return true and the list of guardians minus the found guardian upon success,
     * false and the original list of guardians if not found.
     */
    function isGuardianOrGuardianSigner(
        address[] memory _guardians,
        address _guardian
    ) internal view returns (bool, address[] memory) {
        if (_guardians.length == 0 || _guardian == address(0)) {
            return (false, _guardians);
        }
        bool isFound = false;
        address[] memory updatedGuardians = new address[](_guardians.length - 1);
        uint256 index = 0;
        for (uint256 i = 0; i < _guardians.length; i++) {
            if (!isFound) {
                // check if _guardian is an account guardian
                if (_guardian == _guardians[i]) {
                    isFound = true;
                    continue;
                }
                // check if _guardian is the owner of a smart contract guardian
                // require(isContract(_guardians[i]), "a");
                // require(isGuardianOwner(_guardians[i], _guardian), "b");
                if (isContract(_guardians[i]) && isGuardianOwner(_guardians[i], _guardian)) {
                    isFound = true;
                    // require(false, "123");
                    continue;
                }
            }
            if (index < updatedGuardians.length) {
                updatedGuardians[index] = _guardians[i];
                index++;
            }
        }
        return isFound ? (true, updatedGuardians) : (false, _guardians);
    }

    /**
     * @notice Checks if an address is the owner of a guardian contract.
     * The method does not revert if the call to the owner() method consumes more then 25000 gas.
     * @param _guardian The guardian contract
     * @param _owner The owner to verify.
     */
    function isGuardianOwner(address _guardian, address _owner) internal view returns (bool) {
        // address owner = address(0);

        // solhint-disable-next-line no-inline-assembly
        // assembly {
        //     let ptr := mload(0x40)
        //     mstore(ptr,OWNER_SIG)
        //     let result := staticcall(25000, _guardian, ptr, 0x20, ptr, 0x20)
        //     if eq(result, 1) {
        //         owner := mload(ptr)
        //     }
        // }
        // return owner == _owner;

        return IWallet(_guardian).isOwner(_owner);
    }

    /**
     * @notice Returns ceil(a / b).
     */
    function ceil(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a / b;
        if (a % b == 0) {
            return c;
        } else {
            return c + 1;
        }
    }
}


// File contracts/Proxy.sol


pragma solidity >=0.8.4;

/**
 * @title Proxy
 * @notice Basic proxy that delegates all calls to a fixed implementing contract.
 * The implementing contract cannot be upgraded.
 * @author Julien Niset - <julien@argent.xyz>
 */
contract Proxy {
    address public immutable implementation;

    event Received(uint indexed value, address indexed sender, bytes data);

    constructor(address _implementation) {
        implementation = _implementation;
    }

    fallback() external payable {
        address target = implementation;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), target, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    receive() external payable {
        emit Received(msg.value, msg.sender, "");
    }
}


// File contracts/Owned.sol


pragma solidity >=0.8.4;

contract Owned {
    address public owner;

    event OwnerChanged(address indexed _newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "owned: Must be owner");
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function changeOwner(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Address must not be null");
        owner = _newOwner;
        emit OwnerChanged(_newOwner);
    }
}


// File contracts/Managed.sol


pragma solidity >=0.8.4;

contract Managed is Owned {
    mapping(address => bool) public managers;

    modifier onlyManager() {
        require(managers[msg.sender] == true, "Must be manager");
        _;
    }

    event ManagerAdded(address indexed _manager);
    event ManagerRevoked(address indexed _manager);

    // function addManager(address _manager) external onlyOwner {
    function addManager(address _manager) external {
        require(_manager != address(0), "manager address must not be null");
        if (managers[_manager] == false) {
            managers[_manager] = true;
            emit ManagerAdded(_manager);
        }
    }

    function revokeManager(address _manager) external virtual onlyOwner {
        require(managers[_manager] == true, "is not a manager");
        delete managers[_manager];
        emit ManagerRevoked(_manager);
    }
}


// File contracts/Factory.sol


pragma solidity >=0.8.4;

// 此为简化版Factory 部分设置不完全




contract Factory is Managed {
    address internal constant ETH_TOKEN = address(0);

    address public immutable walletImplementation;
    address public immutable guardianStorage;

    address public refundAddress;

    // *****EVENTS***** //
    event RefundAddressChanged(address addr);

    // indexed 修饰符 将参数作为topic存储
    event WalletCreated(address indexed wallet, address indexed owner, address refundToken, uint256 refundAmount);

    // ***EVENTS END*** //

    constructor(address _walletImplementation, address _guardianStorage, address _refundAddress) public {
        require(_walletImplementation != address(0), "WF: empty wallet implementation");
        require(_guardianStorage != address(0), "WF: empty guardian storage");
        require(_refundAddress != address(0), "WF: empty refund address");
        walletImplementation = _walletImplementation;
        guardianStorage = _guardianStorage;
        refundAddress = _refundAddress;
    }

    function revokeManager(address) external pure override {
        revert("WF: Manager can not REVOKE in WF");
    }

    function validateInputs(address _owner, address[] calldata _modules) internal pure {
        require(_owner != address(0), "WF: empty owner address");
        require(_modules.length > 0, "WF: empty modules");
    }

    function createCounterfactualWallet(
        address _owner,
        address[] calldata _modules,
        bytes20 _salt,
        uint256 _refundAmount,
        address _refundToken,
        bytes calldata _ownerSignature,
        bytes calldata _managerSignature
    ) external returns (address _wallet) {
        validateInputs(_owner, _modules);
        bytes32 newsalt = newSalt(_salt, _owner, _modules);
        address payable wallet = payable(new Proxy{ salt: newsalt }(walletImplementation));
        validateAuthorisedCreation(wallet, _managerSignature);
        if (_modules.length == 1) {
            require(_modules[0] != address(0), "empty modules");
        }
        configureWallet(BaseWallet(wallet), _owner, _modules);

        if (_refundAmount > 0 && _ownerSignature.length == 65) {
            // require(_refundAmount < 0, "123");
            validateAndRefund(wallet, _owner, _refundAmount, _refundToken, _ownerSignature);
        }
        // remove the factory from the authorised modules
        BaseWallet(wallet).authoriseModule(address(this), false);

        // emit event
        emit WalletCreated(wallet, _owner, _refundToken, _refundAmount);

        return wallet;
    }

    // Gets the address of a counterfactual wallet with a first default guardian.
    function getAddressForCounterfactualWallet(
        address _owner,
        address[] calldata _modules,
        bytes20 _salt
    ) external view returns (address _wallet) {
        validateInputs(_owner, _modules);
        // 几次加密？？
        bytes32 newsalt = newSalt(_salt, _owner, _modules);
        bytes memory code = abi.encodePacked(type(Proxy).creationCode, uint256(uint160(walletImplementation)));
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), newsalt, keccak256(code)));
        _wallet = address(uint160(uint256(hash)));
    }

    function changeRefundAddress(address _refundAddress) external onlyOwner {
        require(_refundAddress != address(0), "WF: cannot set to empty");
        refundAddress = _refundAddress;
        emit RefundAddressChanged(_refundAddress);
    }

    function init(BaseWallet _wallet) external pure {
        // do nothing
    }

    function configureWallet(BaseWallet _wallet, address _owner, address[] calldata _modules) internal {
        // add the factory to modules so it can add the first guardian and trigger the refund
        address[] memory extendedModules = new address[](_modules.length + 1);
        extendedModules[0] = address(this);
        for (uint i = 0; i < _modules.length; i++) {
            extendedModules[i + 1] = _modules[i];
        }
        // initialise the wallet with the owner and the extended modules
        _wallet.init(_owner, extendedModules);
    }

    function newSalt(bytes20 _salt, address _owner, address[] calldata _modules) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(keccak256(abi.encodePacked(_owner, _modules)), _salt));
    }

    function validateAuthorisedCreation(address _wallet, bytes memory _managerSignature) internal view {
        address manager;
        if (_managerSignature.length != 65) {
            manager = msg.sender;
        } else {
            bytes32 signedHash = keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", bytes32(uint256(uint160(_wallet))))
            );
            manager = Utils.recoverSigner(signedHash, _managerSignature, 0);
        }
        require(managers[manager], "WF: unauthorised wallet creation"); // 问题 2
    }

    function validateAndRefund(
        address _wallet,
        address _owner,
        uint256 _refundAmount,
        address _refundToken,
        bytes memory _ownerSignature
    ) internal {
        bytes32 signedHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(_wallet, _refundAmount, _refundToken))
            )
        );
        address signer = Utils.recoverSigner(signedHash, _ownerSignature, 0);
        if (signer == _owner) {
            if (_refundToken == ETH_TOKEN) {
                // require(_refundAmount < 0, "123");
                invokeWallet(_wallet, refundAddress, _refundAmount, "");
            } else {
                bytes memory methodData = abi.encodeWithSignature(
                    "transfer(address,uint256)",
                    refundAddress,
                    _refundAmount
                );
                bytes memory transferSuccessBytes = invokeWallet(_wallet, _refundToken, 0, methodData);
                if (transferSuccessBytes.length > 0) {
                    require(abi.decode(transferSuccessBytes, (bool)), "WF: Refund transfer failed");
                }
            }
        }
    }

    function invokeWallet(
        address _wallet,
        address _to,
        uint256 _value,
        bytes memory _data
    ) internal returns (bytes memory _res) {
        bool success;
        (success, _res) = _wallet.call(abi.encodeWithSignature("invoke(address,uint256,bytes)", _to, _value, _data));
        if (success) {
            (_res) = abi.decode(_res, (bytes));
        } else {
            // solhint-disable-next-line no-inline-assembly
            assembly {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }
}
