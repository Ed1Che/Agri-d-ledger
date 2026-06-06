// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IdentityRegistry.sol";
import "./ChainOfCustody.sol";
import "./QualityVerification.sol";

contract PaymentEscrow {

    IdentityRegistry public identityRegistry;
    ChainOfCustody public chainOfCustody;
    QualityVerification public qualityVerification;

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

    mapping(bytes32 => Escrow) public escrows;   // escrowId => Escrow
    mapping(address => uint256) public balances;  // withdrawable balances

    event EscrowCreated(bytes32 indexed escrowId, bytes32 indexed productId, address buyer, address seller, uint256 amount);
    event PaymentReleased(bytes32 indexed escrowId, address indexed seller, uint256 amount);
    event PaymentRefunded(bytes32 indexed escrowId, address indexed buyer, uint256 amount);
    event EscrowDisputed(bytes32 indexed escrowId, address indexed raisedBy);

    constructor(
        address _identityRegistry,
        address _chainOfCustody,
        address _qualityVerification
    ) {
        identityRegistry = IdentityRegistry(_identityRegistry);
        chainOfCustody = ChainOfCustody(_chainOfCustody);
        qualityVerification = QualityVerification(_qualityVerification);
    }

    // Buyer creates escrow and locks payment
    function createEscrow(
        bytes32 _productId,
        address _seller,
        uint256 _deadlineInSeconds,
        bool _requiresCertification
    ) external payable returns (bytes32) {
        require(msg.value > 0, "Payment amount must be greater than zero");
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Buyer and seller cannot be the same");

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

    // Release payment to seller when conditions are met
    function releasePayment(bytes32 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.Active, "Escrow is not active");
        require(block.timestamp <= escrow.deadline, "Escrow deadline has passed");

        // Condition 1: Seller must now own the product (delivery confirmed)
        require(
            chainOfCustody.getCurrentOwner(escrow.productId) == escrow.seller,
            "Seller does not have custody of product"
        );

        // Condition 2: If certification required, product must be certified
        if (escrow.requiresCertification) {
            require(
                qualityVerification.isProductCertified(escrow.productId),
                "Product is not certified"
            );
        }

        escrow.status = EscrowStatus.Released;
        balances[escrow.seller] += escrow.amount;

        emit PaymentReleased(_escrowId, escrow.seller, escrow.amount);
    }

    // Refund buyer if deadline passed without delivery
    function claimRefund(bytes32 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.Active, "Escrow is not active");
        require(msg.sender == escrow.buyer, "Only buyer can claim refund");
        require(block.timestamp > escrow.deadline, "Deadline has not passed yet");

        escrow.status = EscrowStatus.Refunded;
        balances[escrow.buyer] += escrow.amount;

        emit PaymentRefunded(_escrowId, escrow.buyer, escrow.amount);
    }

    // Raise a dispute for human arbitration
    function raiseDispute(bytes32 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.Active, "Escrow is not active");
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "Only buyer or seller can raise dispute"
        );
        escrow.status = EscrowStatus.Disputed;
        emit EscrowDisputed(_escrowId, msg.sender);
    }

    // Withdraw available balance
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function getEscrow(bytes32 _escrowId) external view returns (Escrow memory) {
        return escrows[_escrowId];
    }
}
