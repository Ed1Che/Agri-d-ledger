// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IdentityRegistry.sol";

error NotAFarmer();
error ProductNotFound(bytes32 productId);
error ProductAlreadyInactive(bytes32 productId);
error InvalidQuantity();
error InvalidHarvestDate();
error EmptyProductType();

contract ProductRegistry is Ownable, Pausable {

    IdentityRegistry public immutable identityRegistry;

    /// @dev Harvest date cannot be more than 2 years in the future
    uint256 public constant MAX_FUTURE_HARVEST = 730 days;

    struct Product {
        bytes32 productId;
        address farmer;
        string productType;
        uint256 quantity;
        uint256 harvestDate;
        string farmGPS;
        bytes32 metadataHash;
        bool isActive;
    }

    mapping(bytes32 => Product) public products;
    mapping(address => bytes32[]) public farmerProducts;

    event ProductRegistered(bytes32 indexed productId, address indexed farmer, uint256 quantity);
    event ProductDeactivated(bytes32 indexed productId);

    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = IdentityRegistry(_identityRegistry);
    }

    modifier onlyFarmer() {
        if (!identityRegistry.hasRole(identityRegistry.FARMER_ROLE(), msg.sender)) {
            revert NotAFarmer();
        }
        _;
    }

    function registerProduct(
        string calldata _productType,
        uint256 _quantity,
        uint256 _harvestDate,
        string calldata _farmGPS,
        bytes32 _metadataHash
    ) external onlyFarmer whenNotPaused returns (bytes32) {
        if (bytes(_productType).length == 0) revert EmptyProductType();
        if (_quantity == 0) revert InvalidQuantity();
        if (_harvestDate > block.timestamp + MAX_FUTURE_HARVEST) revert InvalidHarvestDate();

        bytes32 productId = keccak256(abi.encodePacked(
            msg.sender,
            _productType,
            _quantity,
            _harvestDate,
            block.timestamp,
            block.number
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

    function deactivateProduct(bytes32 _productId) external whenNotPaused {
        Product storage product = products[_productId];
        if (!product.isActive) revert ProductAlreadyInactive(_productId);
        if (product.farmer != msg.sender && !identityRegistry.hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotAFarmer();
        }
        product.isActive = false;
        emit ProductDeactivated(_productId);
    }

    function getProduct(bytes32 _productId) external view returns (Product memory) {
        if (!products[_productId].isActive) revert ProductNotFound(_productId);
        return products[_productId];
    }

    function getFarmerProducts(address _farmer) external view returns (bytes32[] memory) {
        return farmerProducts[_farmer];
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;
}
