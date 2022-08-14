// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface IWallet {
    /**
     * @notice Initialize a wallet
     * @param _owner The owner of the wallet
     * @param _modules the modules list to authorise
     */
    function init(address _owner, address[] calldata _modules) external;

    /**
     * @notice check if an address is an onwer
     * @param _wallet The target wallet.
     * @param _owner the address to check
     * @return bool if the _owner is an owner
     */
    function isOwner(address _wallet, address _owner)
        external
        view
        returns (bool);

    /**
     * @notice add a new owner to a wallet
     * @param _wallet The target wallet.
     * @param _owner the new owner address
     */
    function addOwner(address _wallet, address _owner) external;

    /**
     * @notice remove a new owner from a wallet
     * @param _wallet the target wallet
     * @param _owner the owner to remove
     */
    function deleteOwner(address _wallet, address _owner) external;

    /**
     * @notice  substitute new owner for old owner
     * @param _wallet the target wallet
     * @param _oldOwner the owner of the replacement
     * @param _newOwner the owner of substitution
     */
    function changeOwner(
        address _wallet,
        address _oldOwner,
        address _newOwner
    ) external;

/**
     * @notice get all the owners of the wallet
     * @param _wallet The target wallet.
     * @return owners the owners list of the wallet
     */
    function getOwners(address _wallet) external view returns (address[] memory);
}
