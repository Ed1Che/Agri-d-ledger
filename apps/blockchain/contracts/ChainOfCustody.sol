// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IdentityRegistry.sol";
import "./ProductRegistry.sol";

contract ChainOfCustody {

    IdentityRegistry public identityRegistry;
    ProductRegistry public productRegistry;

    struct CustodyRecord {
        address from;
        address to;
        string locationGPS;
        uint256 timestamp;
        string notes;
    }

    // productId => custody history
    mapping(bytes32 => CustodyRecord[]) public custodyChain;
    // productId => current owner
    mapping(bytes32 => address) public currentOwner;
    // productId => pending transfer recipient
    mapping(bytes32 => address) public pendingTransfer;

    event CustodyTransferred(bytes32 indexed productId, address indexed from, address indexed to);
    event TransferInitiated(bytes32 indexed productId, address indexed from, address indexed to);

    constructor(address _identityRegistry, address _productRegistry) {
        identityRegistry = IdentityRegistry(_identityRegistry);
        productRegistry = ProductRegistry(_productRegistry);
    }

    modifier onlyCurrentOwner(bytes32 _productId) {
        require(currentOwner[_productId] == msg.sender, "Not the current owner");
        _;
    }

    modifier onlyVerifiedParty() {
        require(
            identityRegistry.hasRole(identityRegistry.FARMER_ROLE(), msg.sender) ||
            identityRegistry.hasRole(identityRegistry.COOPERATIVE_ROLE(), msg.sender) ||
            identityRegistry.hasRole(identityRegistry.PROCESSOR_ROLE(), msg.sender),
            "Not a verified participant"
        );
        _;
    }

    // Called when farmer first registers product — sets initial owner
    function initializeCustody(bytes32 _productId) external {
        ProductRegistry.Product memory product = productRegistry.getProduct(_productId);
        require(product.farmer == msg.sender, "Only the farmer can initialize custody");
        require(currentOwner[_productId] == address(0), "Custody already initialized");
        currentOwner[_productId] = msg.sender;
    }

    // Step 1: current owner initiates transfer to next party
    function initiateTransfer(
        bytes32 _productId,
        address _to
    ) external onlyCurrentOwner(_productId) {
        require(
            identityRegistry.hasRole(identityRegistry.COOPERATIVE_ROLE(), _to) ||
            identityRegistry.hasRole(identityRegistry.PROCESSOR_ROLE(), _to),
            "Recipient is not a verified participant"
        );
        pendingTransfer[_productId] = _to;
        emit TransferInitiated(_productId, msg.sender, _to);
    }

    // Step 2: recipient confirms and completes the transfer
    function acceptTransfer(
        bytes32 _productId,
        string memory _locationGPS,
        string memory _notes
    ) external {
        require(pendingTransfer[_productId] == msg.sender, "No pending transfer for you");

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
}
