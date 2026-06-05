// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IdentityRegistry.sol";
import "./ProductRegistry.sol";

contract QualityVerification {

    IdentityRegistry public identityRegistry;
    ProductRegistry public productRegistry;

    // Verification trust tiers from your proposal
    enum VerificationTier { FarmerClaim, SensorVerified, LabCertified }

    enum CertificateStatus { Pending, Approved, Rejected, Revoked }

    struct QualityReport {
        bytes32 productId;
        address verifier;
        VerificationTier tier;
        uint256 pesticideLevel;   // in parts per billion
        uint256 moistureLevel;    // percentage x 100 (e.g. 1250 = 12.50%)
        bool meetsStandards;
        uint256 timestamp;
        bytes32 reportHash;       // IPFS hash of full lab report
    }

    struct Certificate {
        bytes32 productId;
        string certificateType;   // "Organic", "FairTrade", "Premium"
        CertificateStatus status;
        uint256 issuedAt;
        address issuedBy;
    }

    // Maximum residue limits (parts per billion)
    uint256 public constant MAX_PESTICIDE_PPB = 500;
    uint256 public constant MAX_MOISTURE_PERCENT_X100 = 1400; // 14.00%

    mapping(bytes32 => QualityReport[]) public productReports;
    mapping(bytes32 => Certificate) public certificates;
    mapping(address => bool) public accreditedLabs;

    event QualityReportSubmitted(bytes32 indexed productId, address indexed verifier, VerificationTier tier);
    event CertificateIssued(bytes32 indexed productId, string certificateType);
    event CertificateRevoked(bytes32 indexed productId, string reason);

    constructor(address _identityRegistry, address _productRegistry) {
        identityRegistry = IdentityRegistry(_identityRegistry);
        productRegistry = ProductRegistry(_productRegistry);
    }

    modifier onlyRegulator() {
        require(
            identityRegistry.hasRole(identityRegistry.REGULATOR_ROLE(), msg.sender),
            "Only regulators can perform this action"
        );
        _;
    }

    modifier onlyAccreditedLab() {
        require(accreditedLabs[msg.sender], "Only accredited labs can submit reports");
        _;
    }

    function addAccreditedLab(address _lab) external onlyRegulator {
        accreditedLabs[_lab] = true;
    }

    // Farmer self-reports (lowest trust tier)
    function submitFarmerClaim(
        bytes32 _productId,
        uint256 _pesticideLevel,
        uint256 _moistureLevel,
        bytes32 _reportHash
    ) external {
        ProductRegistry.Product memory product = productRegistry.getProduct(_productId);
        require(product.farmer == msg.sender, "Only the product farmer can submit a claim");

        _submitReport(
            _productId, msg.sender, VerificationTier.FarmerClaim,
            _pesticideLevel, _moistureLevel, _reportHash
        );
    }

    // Accredited lab submits verified results (highest trust tier)
    function submitLabReport(
        bytes32 _productId,
        uint256 _pesticideLevel,
        uint256 _moistureLevel,
        bytes32 _reportHash
    ) external onlyAccreditedLab {
        _submitReport(
            _productId, msg.sender, VerificationTier.LabCertified,
            _pesticideLevel, _moistureLevel, _reportHash
        );

        // Auto-issue certificate if standards met
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

        emit CertificateIssued(_productId, _certificateType);
    }

    function revokeCertificate(
        bytes32 _productId,
        string memory _reason
    ) external onlyRegulator {
        require(
            certificates[_productId].status == CertificateStatus.Approved,
            "No active certificate to revoke"
        );
        certificates[_productId].status = CertificateStatus.Revoked;
        emit CertificateRevoked(_productId, _reason);
    }

    function getLatestReport(bytes32 _productId) external view returns (QualityReport memory) {
        require(productReports[_productId].length > 0, "No reports for this product");
        return productReports[_productId][productReports[_productId].length - 1];
    }

    function getCertificate(bytes32 _productId) external view returns (Certificate memory) {
        return certificates[_productId];
    }

    function isProductCertified(bytes32 _productId) external view returns (bool) {
        return certificates[_productId].status == CertificateStatus.Approved;
    }
}
