// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IdentityRegistry.sol";
import "./ChainOfCustody.sol";
import "./QualityVerification.sol";

/// @dev Custom errors save ~20% gas vs string reverts and improve ABI readability.
error EscrowNotActive(bytes32 escrowId);
error EscrowDeadlinePassed(bytes32 escrowId);
error EscrowDeadlineNotReached(bytes32 escrowId);
error ZeroPayment();
error InvalidSeller();
error SelfTrade();
error NoBalance();
error TransferFailed();
error SellerLacksProductCustody();
error ProductNotCertified();
error NotBuyerOrSeller();
error DeadlineTooShort();
error DeadlineTooLong();

contract PaymentEscrow is ReentrancyGuard, Ownable, Pausable {

    IdentityRegistry public immutable identityRegistry;
    ChainOfCustody public immutable chainOfCustody;
    QualityVerification public immutable qualityVerification;

    /// @dev Minimum 1 hour, maximum 90 days
    uint256 public constant MIN_DEADLINE = 1 hours;
    uint256 public constant MAX_DEADLINE = 90 days;

    enum EscrowStatus { Active, Released, Refunded, Disputed }

    struct Escrow {
        bytes32 productId;
        address buyer;
        address seller;
        uint256 amount;
        uint256 deadline;
        bool requiresCertification;
        EscrowStatus status;
        uint256 createdAt;
    }

    mapping(bytes32 => Escrow) public escrows;
    mapping(address => uint256) public balances;

    event EscrowCreated(
        bytes32 indexed escrowId,
        bytes32 indexed productId,
        address indexed buyer,
        address seller,
        uint256 amount
    );
    event PaymentReleased(bytes32 indexed escrowId, address indexed seller, uint256 amount);
    event PaymentRefunded(bytes32 indexed escrowId, address indexed buyer, uint256 amount);
    event EscrowDisputed(bytes32 indexed escrowId, address indexed raisedBy);
    event Withdrawn(address indexed account, uint256 amount);

    constructor(
        address _identityRegistry,
        address _chainOfCustody,
        address _qualityVerification
    ) Ownable(msg.sender) {
        identityRegistry = IdentityRegistry(_identityRegistry);
        chainOfCustody = ChainOfCustody(_chainOfCustody);
        qualityVerification = QualityVerification(_qualityVerification);
    }

    /// @notice Buyer locks payment in escrow for a product purchase.
    function createEscrow(
        bytes32 _productId,
        address _seller,
        uint256 _deadlineInSeconds,
        bool _requiresCertification
    ) external payable whenNotPaused returns (bytes32) {
        if (msg.value == 0) revert ZeroPayment();
        if (_seller == address(0)) revert InvalidSeller();
        if (_seller == msg.sender) revert SelfTrade();
        if (_deadlineInSeconds < MIN_DEADLINE) revert DeadlineTooShort();
        if (_deadlineInSeconds > MAX_DEADLINE) revert DeadlineTooLong();

        bytes32 escrowId = keccak256(abi.encodePacked(
            _productId,
            msg.sender,
            _seller,
            msg.value,
            block.timestamp
        ));

        escrows[escrowId] = Escrow({
            productId: _productId,
            buyer: msg.sender,
            seller: _seller,
            amount: msg.value,
            deadline: block.timestamp + _deadlineInSeconds,
            requiresCertification: _requiresCertification,
            status: EscrowStatus.Active,
            createdAt: block.timestamp
        });

        emit EscrowCreated(escrowId, _productId, msg.sender, _seller, msg.value);
        return escrowId;
    }

    /// @notice Release payment to seller when delivery and (optional) certification conditions are met.
    function releasePayment(bytes32 _escrowId) external whenNotPaused {
        Escrow storage escrow = escrows[_escrowId];
        if (escrow.status != EscrowStatus.Active) revert EscrowNotActive(_escrowId);
        if (block.timestamp > escrow.deadline) revert EscrowDeadlinePassed(_escrowId);

        if (chainOfCustody.getCurrentOwner(escrow.productId) != escrow.seller) {
            revert SellerLacksProductCustody();
        }

        if (escrow.requiresCertification) {
            if (!qualityVerification.isProductCertified(escrow.productId)) {
                revert ProductNotCertified();
            }
        }

        escrow.status = EscrowStatus.Released;
        balances[escrow.seller] += escrow.amount;

        emit PaymentReleased(_escrowId, escrow.seller, escrow.amount);
    }

    /// @notice Buyer reclaims funds if the deadline passed without delivery.
    function claimRefund(bytes32 _escrowId) external whenNotPaused {
        Escrow storage escrow = escrows[_escrowId];
        if (escrow.status != EscrowStatus.Active) revert EscrowNotActive(_escrowId);
        if (msg.sender != escrow.buyer) revert InvalidSeller(); // only buyer
        if (block.timestamp <= escrow.deadline) revert EscrowDeadlineNotReached(_escrowId);

        escrow.status = EscrowStatus.Refunded;
        balances[escrow.buyer] += escrow.amount;

        emit PaymentRefunded(_escrowId, escrow.buyer, escrow.amount);
    }

    /// @notice Either party can escalate to human arbitration while active.
    function raiseDispute(bytes32 _escrowId) external whenNotPaused {
        Escrow storage escrow = escrows[_escrowId];
        if (escrow.status != EscrowStatus.Active) revert EscrowNotActive(_escrowId);
        if (msg.sender != escrow.buyer && msg.sender != escrow.seller) revert NotBuyerOrSeller();

        escrow.status = EscrowStatus.Disputed;
        emit EscrowDisputed(_escrowId, msg.sender);
    }

    /// @notice Pull-payment withdraw — safe against reentrancy via nonReentrant + zeroing before transfer.
    function withdraw() external nonReentrant whenNotPaused {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert NoBalance();

        // Zero balance before transfer (checks-effects-interactions)
        balances[msg.sender] = 0;

        // Use call instead of transfer to avoid gas stipend issues
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            // Restore balance on failure so funds aren't lost
            balances[msg.sender] = amount;
            revert TransferFailed();
        }

        emit Withdrawn(msg.sender, amount);
    }

    function getEscrow(bytes32 _escrowId) external view returns (Escrow memory) {
        return escrows[_escrowId];
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
