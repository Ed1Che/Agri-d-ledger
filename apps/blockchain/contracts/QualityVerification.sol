// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IdentityRegistry.sol";
import "./ProductRegistry.sol";

error NotRegulator();
error NotAccreditedLab();
error NotProductFarmer();
error NoReportsForProduct(bytes32 productId);
error NoCertificateToRevoke(bytes32 productId);
error LabAlreadyAccredited(address lab);
error ZeroAddressLab();

contract QualityVerification is Ownable, Pausable {

    IdentityRegistry public immutable identityRegistry;
    ProductRegistry public immutable productRegistry;

    enum VerificationTier { FarmerClaim, SensorVerified, LabCertified }
    enum CertificateStatus { Pending, Approved, Rejected, Revoked }

    struct QualityReport {
        bytes32 productId;
        address verifier;
        VerificationTier tier;
        uint256 pesticideLevel;
        uint256 moistureLevel;
        bool meetsStandards;
        uint256 timestamp;
        bytes32 reportHash;
    }

    struct Certificate {
        bytes32 productId;
        string certificateType;
        CertificateStatus status;
        uint256 issuedAt;
        address issuedBy;
    }

    uint256 public constant MAX_PESTICIDE_PPB = 500;
    uint256 public constant MAX_MOISTURE_PERCENT_X100 = 1400;

    mapping(bytes32 => QualityReport[]) public productReports;
    mapping(bytes32 => Certificate) public certificates;
    mapping(address => bool) public accreditedLabs;

    event QualityReportSubmitted(bytes32 indexed productId, address indexed verifier, VerificationTier tier);
    event CertificateIssued(bytes32 indexed productId, string certificateType, address indexed issuedBy);
    event CertificateRevoked(bytes32 indexed productId, string reason);
    event LabAccredited(address indexed lab);
    event LabRevoked(address indexed lab);

    constructor(address _identityRegistry, address _productRegistry) Ownable(msg.sender) {
        identityRegistry = IdentityRegistry(_identityRegistry);
        productRegistry = ProductRegistry(_productRegistry);
    }

    modifier onlyRegulator() {
        if (!identityRegistry.hasRole(identityRegistry.REGULATOR_ROLE(), msg.sender)) {
            revert NotRegulator();
        }
        _;
    }

    modifier onlyAccreditedLab() {
        if (!accreditedLabs[msg.sender]) revert NotAccreditedLab();
        _;
    }

    function addAccreditedLab(address _lab) external onlyRegulator {
        if (_lab == address(0)) revert ZeroAddressLab();
        if (accreditedLabs[_lab]) revert LabAlreadyAccredited(_lab);
        accreditedLabs[_lab] = true;
        emit LabAccredited(_lab);
    }

    function revokeAccreditedLab(address _lab) external onlyRegulator {
        accreditedLabs[_lab] = false;
        emit LabRevoked(_lab);
    }

    /// @notice Farmer self-reports quality — lowest trust tier.
    function submitFarmerClaim(
        bytes32 _productId,
        uint256 _pesticideLevel,
        uint256 _moistureLevel,
        bytes32 _reportHash
    ) external whenNotPaused {
        ProductRegistry.Product memory product = productRegistry.getProduct(_productId);
        if (product.farmer != msg.sender) revert NotProductFarmer();

        _submitReport(
            _productId, msg.sender, VerificationTier.FarmerClaim,
            _pesticideLevel, _moistureLevel, _reportHash
        );
    }

    /// @notice Accredited lab submits verified results — highest trust tier.
    function submitLabReport(
        bytes32 _productId,
        uint256 _pesticideLevel,
        uint256 _moistureLevel,
        bytes32 _reportHash
    ) external onlyAccreditedLab whenNotPaused {
        _submitReport(
            _productId, msg.sender, VerificationTier.LabCertified,
            _pesticideLevel, _moistureLevel, _reportHash
        );

        if (_pesticideLevel <= MAX_PESTICIDE_PPB && _moistureLevel <= MAX_MOISTURE_PERCENT_X100) {
            _issueCertificate(_productId, "Organic", msg.sender);
        }
    }

    function _submitReport(
        bytes32 _productId,
        address _verifier,
        VerificationTier _tier,
        uint256 _pesticideLevel,
        uint256 _moistureLevel,
        bytes32 _reportHash
    ) internal {
        bool meetsStandards = (
            _pesticideLevel <= MAX_PESTICIDE_PPB &&
            _moistureLevel <= MAX_MOISTURE_PERCENT_X100
        );

        productReports[_productId].push(QualityReport({
            productId: _productId,
            verifier: _verifier,
            tier: _tier,
            pesticideLevel: _pesticideLevel,
            moistureLevel: _moistureLevel,
            meetsStandards: meetsStandards,
            timestamp: block.timestamp,
            reportHash: _reportHash
        }));

        emit QualityReportSubmitted(_productId, _verifier, _tier);
    }

    function _issueCertificate(
        bytes32 _productId,
        string memory _certificateType,
        address _issuedBy
    ) internal {
        certificates[_productId] = Certificate({
            productId: _productId,
            certificateType: _certificateType,
            status: CertificateStatus.Approved,
            issuedAt: block.timestamp,
            issuedBy: _issuedBy
        });

        emit CertificateIssued(_productId, _certificateType, _issuedBy);
    }

    function revokeCertificate(
        bytes32 _productId,
        string calldata _reason
    ) external onlyRegulator whenNotPaused {
        if (certificates[_productId].status != CertificateStatus.Approved) {
            revert NoCertificateToRevoke(_productId);
        }
        certificates[_productId].status = CertificateStatus.Revoked;
        emit CertificateRevoked(_productId, _reason);
    }

    function getLatestReport(bytes32 _productId) external view returns (QualityReport memory) {
        if (productReports[_productId].length == 0) revert NoReportsForProduct(_productId);
        return productReports[_productId][productReports[_productId].length - 1];
    }

    function getCertificate(bytes32 _productId) external view returns (Certificate memory) {
        return certificates[_productId];
    }

    function isProductCertified(bytes32 _productId) external view returns (bool) {
        return certificates[_productId].status == CertificateStatus.Approved;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
