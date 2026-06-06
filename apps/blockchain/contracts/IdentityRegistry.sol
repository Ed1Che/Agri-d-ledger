// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract IdentityRegistry is AccessControl {

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

    event ParticipantRegistered(address indexed participant, bytes32 role);
    event ParticipantRevoked(address indexed participant);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function registerParticipant(
        address _address,
        bytes32 _role,
        string memory _name,
        string memory _location
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        participants[_address] = Participant(_name, _location, true, block.timestamp);
        _grantRole(_role, _address);
        emit ParticipantRegistered(_address, _role);
    }

    function revokeParticipant(address _address, bytes32 _role) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        participants[_address].isActive = false;
        _revokeRole(_role, _address);
        emit ParticipantRevoked(_address);
    }
}