// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "./interface/IAuthoriser.sol";
import "./interface/IFilter.sol";

contract DappRegistry is IAuthoriser {
    uint64 public timelockPeriod;
    uint64 public newTimelockPeriod;
    // time at which the new timelock becomes effective
    uint64 public ChangeTimelockPeriodTime;

    // enabled registry ids for each wallet
    // wallet => ids
    mapping(address => bytes32) public enabledRegistryIds;
    // authorised dapps and their filters for each registry id
    // ids => dapp => filter
    mapping(uint8 => mapping(address => bytes32)) public authorisations;
    //pending authorised dapps and their filters for each registry id
    // ids => dapp => filter
    mapping(uint8 => mapping(address => bytes32)) public pendingFilterUpdates;
    // owners for each registry id
    mapping(uint8 => address) public registryOwners;

    event RegistryCreated(uint8 registryId, address registryOwner);
    event OwnerChanged(uint8 registryId, address newRegistryOwner);
    event TimelockChangeRequested(uint64 newTimelockPeriod);
    event TimelockChanged(uint64 newTimelockPeriod);
    event FilterUpdateRequested(
        uint8 indexed registryId,
        address dapp,
        address filter,
        uint256 validAfter
    );
    event FilterUpdated(
        uint8 indexed registryId,
        address dapp,
        address filter,
        uint256 validAfter
    );
    event DappAdded(
        uint8 indexed registryId,
        address dapp,
        address filter,
        uint256 validAfter
    );
    event DappRemoved(uint8 indexed registryId, address dapp);
    event ToggledRegistry(
        address indexed sender,
        uint8 registryId,
        bool enabled
    );

    modifier onlyOwner(uint8 _registryId) {
        address owner = registryOwners[_registryId];
        require(owner != address(0), "unknown registry");
        require(msg.sender == owner, "sender != registry owner");
        _;
    }

    constructor(uint64 _timelockPeriod) {
        timelockPeriod = _timelockPeriod;
        registryOwners[0] = msg.sender;
        emit RegistryCreated(0, msg.sender);
        emit TimelockChanged(_timelockPeriod);
    }

    function isEnabledRegistry(address _wallet, uint8 _registryId)
        external
        view
        returns (bool isEnabled)
    {
        uint256 registries = uint256(enabledRegistryIds[_wallet]);
        return (((registries >> _registryId) & 1) > 0) == (_registryId > 0);
    }

    function isAuthorised(
        address _wallet,
        address _spender,
        address _to,
        bytes calldata _data
    ) public view override returns (bool) {
        uint256 registries = uint256(enabledRegistryIds[_wallet]);
        // check default Registry
        //registries [0] : wallet registry is enabled
        for (
            uint256 registryId = 0;
            registryId == 0 || (registries >> registryId) > 0;
            registryId++
        ) {
            bool isEnabled = (((registries >> registryId) & 1) > 0) == /* "is bit set for regId?" */
                (registryId > 0); /* "not registry?" */
            if (isEnabled) {
                // if registryId is enabled
                uint256 auth = uint256(
                    authorisations[uint8(registryId)][_spender]
                );
                uint256 validAfter = auth & 0xffffffffffffffff;
                if (0 < validAfter && validAfter <= block.timestamp) {
                    // if the current time is greater than the validity time
                    address filter = address(uint160(auth >> 64));
                    if (
                        filter == address(0) ||
                        IFilter(filter).isValid(_wallet, _spender, _to, _data)
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function areAuthorised(
        address _wallet,
        address[] calldata _spenders,
        address[] calldata _to,
        bytes[] calldata _data
    ) external view override returns (bool) {
        for (uint256 i = 0; i < _spenders.length; i++) {
            if (!isAuthorised(_wallet, _spenders[i], _to[i], _data[i])) {
                return false;
            }
        }
        return true;
    }

    function toggleRegistry(uint8 _registryId, bool _enabled) external {
        require(registryOwners[_registryId] != address(0), "unknown registry");
        uint256 registries = uint256(enabledRegistryIds[msg.sender]);
        bool current = (((registries >> _registryId) & 1) > 0) ==
            (_registryId > 0);
        if (current != _enabled) {
            enabledRegistryIds[msg.sender] = bytes32(
                registries ^ (uint256(1) << _registryId)
            );
            emit ToggledRegistry(msg.sender, _registryId, _enabled);
        }
    }



    function createRegistry(uint8 _registryId, address _registryOwner)
        external
        onlyOwner(0)
    {
        require(_registryOwner != address(0), "registry owner is address(0)");
        require(
            registryOwners[_registryId] == address(0),
            "duplicate registry"
        );
        registryOwners[_registryId] = _registryOwner;
        emit RegistryCreated(_registryId, _registryOwner);
    }
    function changeOwner(uint8 _registryId, address _newRegistryOwner) external onlyOwner(_registryId){
        require(_newRegistryOwner != address(0),"new registryOwner is address(0)");
        registryOwners[_registryId] = _newRegistryOwner;
        emit OwnerChanged(_registryId, _newRegistryOwner);
    }
    function requestTimelockChange(uint64 _newTimelockPeriod) external onlyOwner(0){
        newTimelockPeriod = _newTimelockPeriod;
        ChangeTimelockPeriodTime = uint64(block.timestamp) + timelockPeriod;
        emit TimelockChangeRequested(_newTimelockPeriod);
    }
    function confirmTimelockChange() external{
        uint64 newPeriod = newTimelockPeriod;
        require(ChangeTimelockPeriodTime > 0 && ChangeTimelockPeriodTime <= block.timestamp,"is not time to change timelock");
        timelockPeriod = newPeriod;
        newTimelockPeriod = 0;
        ChangeTimelockPeriodTime = 0;
        emit TimelockChanged(newPeriod);
    }



    function getAuthorisation(uint8 _registryId, address _dapp) external view returns(address filter, uint64 validAfter){
        uint auth = uint(authorisations[_registryId][_dapp]);
        filter = address(uint160(auth >> 64));
        validAfter = uint64(auth & 0xffffffffffffffff);
    }
    function addDapp(
        uint8 _registryId,
        address _dapp,
        address _filter
    ) external onlyOwner(_registryId){
        require(
            authorisations[_registryId][_dapp] == bytes32(0),
            "dapp already added"
        );
        uint256 validAfter = block.timestamp + timelockPeriod;
        // Store the new authorisation as {filter:160}{validAfter:64}.
        authorisations[_registryId][_dapp] = bytes32(
            (uint256(uint160(_filter)) << 64) | validAfter
        );
        emit DappAdded(_registryId, _dapp, _filter, validAfter);
    }
    function removeDapp(uint8 _registryId, address _dapp) external onlyOwner(_registryId){
        require(authorisations[_registryId][_dapp] != bytes32(0), "unknown dapp");
        delete authorisations[_registryId][_dapp];
        delete pendingFilterUpdates[_registryId][_dapp];
        emit DappRemoved(_registryId, _dapp);
    }

    function requestFilterUpdate(uint8 _registryId, address _dapp, address _filter) external onlyOwner(_registryId){
        require(authorisations[_registryId][_dapp] != bytes32(0),"unknown dapp");
        uint validAfter = block.timestamp + timelockPeriod;
        pendingFilterUpdates[_registryId][_dapp] = bytes32((uint(uint160(_filter)) << 64) | validAfter);
        emit FilterUpdateRequested(_registryId, _dapp, _filter, validAfter);
    }
    function confirmFilterUpdate(uint8 _registryId, address _dapp) external{
        uint newAuth = uint(pendingFilterUpdates[_registryId][_dapp]);
        require(newAuth > 0, "no pending filter update");
        uint validAfter = newAuth & 0xffffffffffffffff;
        require(validAfter <= block.timestamp,"too early to confirm auth");
        authorisations[_registryId][_dapp] = bytes32(newAuth);
        emit FilterUpdated(_registryId,_dapp,address(uint160(newAuth >> 64)),validAfter);
        delete pendingFilterUpdates[_registryId][_dapp];
    }

}
