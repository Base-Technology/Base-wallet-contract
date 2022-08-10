// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;
import "./lib/ERC20Token.sol";
import "./lib/ERC20.sol";

contract BaseWallet {
    address public owner;
    // The authorised modules
    mapping(address => bool) public authorised;
    // module executing static calls
    address public staticCallExecutor;
    // The number of modules
    uint256 public modules;
    // mapping(owner)

    mapping(address => bool) public guardian;
    address public guardianStorage;

    event AuthorisedModule(address indexed module, bool value);
    event Received(uint256 indexed value, address indexed sender, bytes data);

    function init(address _owner, address[] calldata _modules) external {
        require(
            owner == address(0) && modules == 0,
            "BW: wallet already initialised"
        );
        require(_modules.length > 0, "BW: empty modules");
        owner = _owner;
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
    // function init(address _owner, address _guardianStorage) public {
    //     owner = _owner;
    //     guardianStorage = _guardianStorage;
    // }

    // ********** transact function ********** //
    /**
     * @notice send
     */
    function sendtoken(
        address _sender,
        address _receiver
        // uint256 _value
    ) payable public {
        address token = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
        uint256 _value = 1;
        if (_value > 0 && _receiver != address(0x0)) {
            // require(
                ERC20Token(token).transferFrom(_from, _to, _value);
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
                case 0 {revert(0, returndatasize())}
                default {return (0, returndatasize())}
            }
        }
    }

    receive() external payable {
    }
}
