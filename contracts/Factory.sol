// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

// 此为简化版Factory 部分设置不完全
import "./BaseWallet.sol";
import "./Proxy.sol";
import "./Utils.sol";
contract Factory {

  address constant internal ETH_TOKEN = address(0);

  address immutable public walletImplementation;
  address immutable public guardianStorage;

  address public refundAddress;
  mapping (address => bool) public managers;
  address public owner;

  modifier onlyOwner {
        require(msg.sender == owner, "Must be owner");
        _;
    }

  // *****EVENTS***** //
  event RefundAddressChanged(address addr);
  event ManagerAdded(address addr);
  // indexed 修饰符 将参数作为topic存储
  event WalletCreated(
    address indexed wallet, 
    address indexed owner, 
    address indexed guardian, 
    address refundToken,
    uint256 refundAmount
    );
  // ***EVENTS END*** //

  constructor(address _walletImplementation, address _guardianStorage, address _refundAddress) public {
      require(_walletImplementation != address(0), "WF: empty wallet implementation");
      require(_guardianStorage != address(0), "WF: empty guardian storage");
      require(_refundAddress != address(0), "WF: empty refund address");
      walletImplementation = _walletImplementation;
      guardianStorage = _guardianStorage;
      refundAddress = _refundAddress;
      owner = msg.sender;
    }

  function revokeManager(address) external pure {
      revert("WF: Manager can not REVOKE in WF");
    }

  function validateInputs(address _owner, address[] calldata _modules, address _guardian) internal pure {
        require(_owner != address(0), "WF: empty owner address");
        require(_owner != _guardian, "WF: owner cannot be guardian");
        require(_modules.length > 0, "WF: empty modules");
        require(_guardian != (address(0)), "WF: empty guardian");        
    }

  function createCounterfactualWallet(
      address _owner,
      address[] calldata _modules,
      address _guardian,
      address _refundToken,
      bytes20 _salt,
      bytes calldata _ownerSignature,
      bytes calldata _managerSignature,
      uint256 _refundAmount
    ) 
    external
    returns ( address _wallet )
    {
      validateInputs(_owner, _modules, _guardian);
      bytes32 newsalt = newSalt(_salt, _owner, _modules, _guardian);
      address payable wallet = payable(new Proxy{salt: newsalt}(walletImplementation));
      validateAuthorisedCreation(wallet, _managerSignature);
      configureWallet(BaseWallet(wallet), _owner, _modules, _guardian);

      if (_refundAmount > 0 && _ownerSignature.length == 65) {
              validateAndRefund(wallet, _owner, _refundAmount, _refundToken, _ownerSignature);
          }
          // remove the factory from the authorised modules
          BaseWallet(wallet).authoriseModule(address(this), false);

          // emit event
          emit WalletCreated(wallet, _owner, _guardian, _refundToken, _refundAmount);

          return wallet;
    }
    // Gets the address of a counterfactual wallet with a first default guardian.
  function getAddressFromCfWallet(
      address _owner,
      address[] calldata _modules,
      address _guardian,
      bytes20 _salt
    ) 
    external
    view  
    returns ( address _wallet ) {
      validateInputs(_owner, _modules, _guardian);
      // 几次加密？？
      bytes32 newsalt = newSalt(_salt, _owner, _modules, _guardian);
      bytes memory code = abi.encodePacked(type(Proxy).creationCode, uint256(uint160(walletImplementation)));
      bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), newsalt, keccak256(code)));
      _wallet = address(uint160(uint256(hash)));
    }


  function changeRefundAddress(address _refundAddress) external onlyOwner {
    require(_refundAddress != address(0), "WF: cannot set to empty");
    refundAddress = _refundAddress;
    emit RefundAddressChanged(_refundAddress);
    }

  function init(BaseWallet _wallet)  external pure {
    // do nothing
    }
  function configureWallet(
      BaseWallet _wallet, 
      address _owner, 
      address[] calldata _modules, 
      address _guardian
    ) 
    internal 
    {
      // add the factory to modules so it can add the first guardian and trigger the refund
      address[] memory extendedModules = new address[](_modules.length + 1);
      extendedModules[0] = address(this);
      for (uint i = 0; i < _modules.length; i++) {
          extendedModules[i + 1] = _modules[i];
      }
      // initialise the wallet with the owner and the extended modules
      _wallet.init(_owner, extendedModules);
      // add the first guardian
      // IGuardianStorage(guardianStorage).addGuardian(address(_wallet), _guardian);
      _wallet.addGuardian(address(_wallet), _guardian);
    }

  function newSalt(bytes20 _salt, address _owner, address[] calldata _modules, address _guardian) internal pure returns (bytes32) {
      return keccak256(abi.encodePacked(keccak256(abi.encodePacked(_owner, _modules, _guardian)), _salt));
    }


  function validateAuthorisedCreation(address _wallet, bytes memory _managerSignature) internal view {
      address manager;
      if(_managerSignature.length != 65) {
          manager = msg.sender;
      } else {
          bytes32 signedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", bytes32(uint256(uint160(_wallet)))));
          manager = Utils.recoverSigner(signedHash, _managerSignature, 0);
      }
      require(managers[manager], "WF: unauthorised wallet creation");
    }

  function validateAndRefund(
      address _wallet,
      address _owner,
      uint256 _refundAmount,
      address _refundToken,
      bytes memory _ownerSignature
    )
      internal
    {
        bytes32 signedHash = keccak256(abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(_wallet, _refundAmount, _refundToken))
            ));
        address signer = Utils.recoverSigner(signedHash, _ownerSignature, 0);
        if (signer == _owner) {
            if (_refundToken == ETH_TOKEN) {
                invokeWallet(_wallet, refundAddress, _refundAmount, "");
            } else {
                bytes memory methodData = abi.encodeWithSignature("transfer(address,uint256)", refundAddress, _refundAmount);
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
    )
        internal
        returns (bytes memory _res)
    {
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
  function addManager(address _manager) external onlyOwner {
      require(_manager != address(0), "M: Address must not be null");
      if (managers[_manager] == false) {
          managers[_manager] = true;
          emit ManagerAdded(_manager);
      }
  }

}

