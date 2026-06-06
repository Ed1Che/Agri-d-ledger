// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IdentityRegistry.sol";

contract ProductRegistry {

    IdentityRegistry public identityRegistry;

    struct Product {
        bytes32 productId;
        address farmer;
        string productType;
        uint256 quantity;        // in kg
        uint256 harvestDate;
        string farmGPS;
        bytes32 metadataHash;    // IPFS hash of detailed data (images, reports)
        bool isActive;
    }

    mapping(bytes32 => Product) public products;
    mapping(address => bytes32[]) public farmerProducts;

    event ProductRegistered(bytes32 indexed productId, address indexed farmer, uint256 quantity);

    constructor(address _identityRegistry) {
        identityRegistry = IdentityRegistry(_identityRegistry);
    }

    modifier onlyFarmer() {
        require(
            identityRegistry.hasRole(identityRegistry.FARMER_ROLE(), msg.sender),
            "Caller is not a registered farmer"
        );
        _;
    }

    function registerProduct(
        string memory _productType,
        uint256 _quantity,
        uint256 _harvestDate,
        string memory _farmGPS,
        bytes32 _metadataHash
    ) external onlyFarmer returns (bytes32) {

        bytes32 productId = keccak256(abi.encodePacked(
            msg.sender,
            _productType,
            _quantity,
            _harvestDate,
            block.timestamp,
            block.number      // adds extra uniqueness
        ));

        products[productId] = Product({
            productId: productId,
            farmer: msg.sender,
            productType: _productType,
            quantity: _quantity,
            harvestDate: _harvestDate,
            farmGPS: _farmGPS,
            metadataHash: _metadataHash,
            isActive: true
        });

        farmerProducts[msg.sender].push(productId);
        emit ProductRegistered(productId, msg.sender, _quantity);
        return productId;
    }

    function getProduct(bytes32 _productId) external view returns (Product memory) {
        require(products[_productId].isActive, "Product not found");
        return products[_productId];
    }

    function getFarmerProducts(address _farmer) external view returns (bytes32[] memory) {
        return farmerProducts[_farmer];
    }
}