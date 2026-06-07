// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

error ParticipantAlreadyRegistered(address participant);
error ParticipantNotFound(address participant);
error InvalidRole();
error ZeroAddress();

contract IdentityRegistry is AccessControl, Pausable {

    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant COOPERATIVE_ROLE = keccak256("COOPERATIVE_ROLE");
    bytes32 public constant PROCESSOR_ROLE = keccak256("PROCESSOR_ROLE");
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");

    struct Participant {
        string name;
        string location;
        bool isActive;
        uint256 registeredAt;
    }

    mapping(address => Participant) public participants;

    event ParticipantRegistered(address indexed participant, bytes32 indexed role);
    event ParticipantRevoked(address indexed participant, bytes32 indexed role);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Register a participant and grant them a role.
    function registerParticipant(
        address _address,
        bytes32 _role,
        string calldata _name,
        string calldata _location
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        if (_address == address(0)) revert ZeroAddress();
        if (bytes(_name).length == 0) revert InvalidRole();
        if (participants[_address].isActive) revert ParticipantAlreadyRegistered(_address);

        participants[_address] = Participant({
            name: _name,
            location: _location,
            isActive: true,
            registeredAt: block.timestamp
        });

        _grantRole(_role, _address);
        emit ParticipantRegistered(_address, _role);
    }

    /// @notice Deactivate a participant and revoke their role.
    function revokeParticipant(address _address, bytes32 _role)
        external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        if (!participants[_address].isActive) revert ParticipantNotFound(_address);

        participants[_address].isActive = false;
        _revokeRole(_role, _address);
        emit ParticipantRevoked(_address, _role);
    }

    function isActive(address _address) external view returns (bool) {
        return participants[_address].isActive;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
