// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IdentityRegistry.sol";
import "./ProductRegistry.sol";

error NotCurrentOwner(bytes32 productId);
error NotVerifiedParticipant();
error CustodyAlreadyInitialized(bytes32 productId);
error NoPendingTransfer(bytes32 productId);
error RecipientNotVerified(address recipient);
error InvalidRecipient();
error OnlyFarmerCanInitialize();

contract ChainOfCustody is Ownable, Pausable {

    IdentityRegistry public immutable identityRegistry;
    ProductRegistry public immutable productRegistry;

    struct CustodyRecord {
        address from;
        address to;
        string locationGPS;
        uint256 timestamp;
        string notes;
    }

    mapping(bytes32 => CustodyRecord[]) public custodyChain;
    mapping(bytes32 => address) public currentOwner;
    mapping(bytes32 => address) public pendingTransfer;

    event CustodyTransferred(bytes32 indexed productId, address indexed from, address indexed to);
    event TransferInitiated(bytes32 indexed productId, address indexed from, address indexed to);
    event CustodyInitialized(bytes32 indexed productId, address indexed farmer);

    constructor(address _identityRegistry, address _productRegistry) Ownable(msg.sender) {
        identityRegistry = IdentityRegistry(_identityRegistry);
        productRegistry = ProductRegistry(_productRegistry);
    }

    modifier onlyCurrentOwner(bytes32 _productId) {
        if (currentOwner[_productId] != msg.sender) revert NotCurrentOwner(_productId);
        _;
    }

    modifier onlyVerifiedParty() {
        if (
            !identityRegistry.hasRole(identityRegistry.FARMER_ROLE(), msg.sender) &&
            !identityRegistry.hasRole(identityRegistry.COOPERATIVE_ROLE(), msg.sender) &&
            !identityRegistry.hasRole(identityRegistry.PROCESSOR_ROLE(), msg.sender)
        ) {
            revert NotVerifiedParticipant();
        }
        _;
    }

    /// @notice Farmer establishes initial ownership after product registration.
    function initializeCustody(bytes32 _productId) external whenNotPaused {
        ProductRegistry.Product memory product = productRegistry.getProduct(_productId);
        if (product.farmer != msg.sender) revert OnlyFarmerCanInitialize();
        if (currentOwner[_productId] != address(0)) revert CustodyAlreadyInitialized(_productId);

        currentOwner[_productId] = msg.sender;

        custodyChain[_productId].push(CustodyRecord({
            from: address(0),
            to: msg.sender,
            locationGPS: product.farmGPS,
            timestamp: block.timestamp,
            notes: "Initial custody"
        }));

        emit CustodyInitialized(_productId, msg.sender);
    }

    /// @notice Current owner nominates next custodian (cooperative or processor).
    function initiateTransfer(
        bytes32 _productId,
        address _to
    ) external onlyCurrentOwner(_productId) onlyVerifiedParty whenNotPaused {
        if (_to == address(0)) revert InvalidRecipient();
        if (
            !identityRegistry.hasRole(identityRegistry.COOPERATIVE_ROLE(), _to) &&
            !identityRegistry.hasRole(identityRegistry.PROCESSOR_ROLE(), _to)
        ) {
            revert RecipientNotVerified(_to);
        }

        pendingTransfer[_productId] = _to;
        emit TransferInitiated(_productId, msg.sender, _to);
    }

    /// @notice Recipient accepts and records the transfer with location proof.
    function acceptTransfer(
        bytes32 _productId,
        string calldata _locationGPS,
        string calldata _notes
    ) external whenNotPaused {
        if (pendingTransfer[_productId] != msg.sender) revert NoPendingTransfer(_productId);

        address previousOwner = currentOwner[_productId];
        currentOwner[_productId] = msg.sender;
        pendingTransfer[_productId] = address(0);

        custodyChain[_productId].push(CustodyRecord({
            from: previousOwner,
            to: msg.sender,
            locationGPS: _locationGPS,
            timestamp: block.timestamp,
            notes: _notes
        }));

        emit CustodyTransferred(_productId, previousOwner, msg.sender);
    }

    function getCustodyHistory(bytes32 _productId)
        external view returns (CustodyRecord[] memory) {
        return custodyChain[_productId];
    }

    function getCurrentOwner(bytes32 _productId) external view returns (address) {
        return currentOwner[_productId];
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
