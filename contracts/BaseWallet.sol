// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;
import "./lib/ERC20Token.sol";
import "./lib/ERC20.sol";
import "./interface/IWallet.sol";

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
            require(
                authorised[_modules[i]] == false,
                "BW: module is already added"
            );
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

    function changeOwner(address _oldOwner, address _newOwner)
        external
        override
    {
        require(ownersinfo[_oldOwner].isOwner, "Error: old owner is not owner");
        require(
            !ownersinfo[_newOwner].isOwner,
            "Error:new owner is already owner"
        );
        uint256 index = ownersinfo[_oldOwner].index;
        owners[index] = _newOwner;
        ownersinfo[_newOwner].isOwner = true;
        ownersinfo[_newOwner].index = index;
        delete ownersinfo[_oldOwner];
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }
    function setOwnerAfterRecovery(address _newOwner) external{
        delete ownersinfo[owners[0]];
        owners[0] = _newOwner;
        ownersinfo[_newOwner].isOwner = true;
        ownersinfo[_newOwner].index = 0;
        while(owners.length > 1){
            address lastOwner = owners[owners.length - 1];
            owners.pop();
            delete ownersinfo[lastOwner];
        }
    }
    function getSender() public view returns(address){
        return msg.sender;
    }
    // function init(address _owner, address _guardianStorage) public {
    //     owner = _owner;
    //     guardianStorage = _guardianStorage;
    // }

    // ********** transact function ********** //
    /**
     * @notice send
     */
    function sendtoken(address _sender, address _receiver)
        public
        payable
    // uint256 _value
    {
        address token = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
        uint256 _value = 1;
        if (_value > 0 && _receiver != address(0x0)) {
            // require(
            ERC20Token(token).transferFrom(_sender, _receiver, _value);
            // );
        }
    }

    function checktokenBalance(address _wallet) public view returns (uint256) {
        address token = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
        uint256 balance = ERC20(token).balanceOf(address(this));
        return balance;
        // return 20;
    }

    // 测试用 功能应在GuardianStorage中实现
    function addGuardian(address _wallet, address _guardian) public {
        require(guardian[_guardian] == false, "BW: guardian already exist");
        guardian[_guardian] = true;
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
    // function enabled(bytes4 _sig) public view returns (address) {
    //     address executor = staticCallExecutor;
    //     if(executor != address(0) && IModule(executor).supportsStaticCall(_sig)) {
    //         return executor;
    //     }
    //     return address(0);
    // }

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
