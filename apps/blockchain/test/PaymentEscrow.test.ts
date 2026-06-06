import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PaymentEscrow", function () {
  let identityRegistry: any, productRegistry: any, chainOfCustody: any;
  let qualityVerification: any, paymentEscrow: any;
  let owner: any, farmer: any, cooperative: any, regulator: any, lab: any, buyer: any;
  let FARMER_ROLE: string, COOPERATIVE_ROLE: string, REGULATOR_ROLE: string;
  let productId: string;
  const ONE_DAY = 86400;
  const PAYMENT = ethers.parseEther("0.1");

  beforeEach(async () => {
    [owner, farmer, cooperative, regulator, lab, buyer] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await Registry.deploy();

    const Product = await ethers.getContractFactory("ProductRegistry");
    productRegistry = await Product.deploy(await identityRegistry.getAddress());

    const Custody = await ethers.getContractFactory("ChainOfCustody");
    chainOfCustody = await Custody.deploy(
      await identityRegistry.getAddress(),
      await productRegistry.getAddress()
    );

    const Quality = await ethers.getContractFactory("QualityVerification");
    qualityVerification = await Quality.deploy(
      await identityRegistry.getAddress(),
      await productRegistry.getAddress()
    );

    const Escrow = await ethers.getContractFactory("PaymentEscrow");
    paymentEscrow = await Escrow.deploy(
      await identityRegistry.getAddress(),
      await chainOfCustody.getAddress(),
      await qualityVerification.getAddress()
    );

    FARMER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FARMER_ROLE"));
    COOPERATIVE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COOPERATIVE_ROLE"));
    REGULATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGULATOR_ROLE"));

    await identityRegistry.registerParticipant(farmer.address, FARMER_ROLE, "John", "Nyeri");
    await identityRegistry.registerParticipant(cooperative.address, COOPERATIVE_ROLE, "Coop A", "Nairobi");
    await identityRegistry.registerParticipant(regulator.address, REGULATOR_ROLE, "KEBS", "Nairobi");

    // Register product and transfer custody to cooperative
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://test"));
    const tx = await productRegistry.connect(farmer).registerProduct(
      "Coffee", 500, 1738800000, "-0.416,36.948", metadataHash
    );
    const receipt = await tx.wait();
    productId = receipt.logs.find(
      (l: any) => l.fragment?.name === "ProductRegistered"
    ).args.productId;

    await chainOfCustody.connect(farmer).initializeCustody(productId);
    await chainOfCustody.connect(farmer).initiateTransfer(productId, cooperative.address);
    await chainOfCustody.connect(cooperative).acceptTransfer(productId, "-1.286,36.817", "Received");
  });

  it("Buyer can create an escrow with locked payment", async () => {
    // buyer and cooperative are different signers
    const tx = await paymentEscrow.connect(buyer).createEscrow(
      productId, cooperative.address, ONE_DAY, false, { value: PAYMENT }
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((l: any) => l.fragment?.name === "EscrowCreated");
    expect(event).to.not.be.undefined;
    expect(event.args.amount).to.equal(PAYMENT);
  });

  it("Payment releases to seller when custody and deadline conditions met", async () => {
    // buyer pays cooperative (who holds custody) as seller
    const tx = await paymentEscrow.connect(buyer).createEscrow(
      productId, cooperative.address, ONE_DAY, false, { value: PAYMENT }
    );
    const receipt = await tx.wait();
    const escrowId = receipt.logs.find(
      (l: any) => l.fragment?.name === "EscrowCreated"
    ).args.escrowId;

    await paymentEscrow.releasePayment(escrowId);

    const escrow = await paymentEscrow.getEscrow(escrowId);
    expect(escrow.status).to.equal(1); // Released
    expect(await paymentEscrow.balances(cooperative.address)).to.equal(PAYMENT);
  });

  it("Buyer gets refund after deadline passes without delivery", async () => {
    // farmer is seller but cooperative holds custody → delivery never happens
    const tx = await paymentEscrow.connect(buyer).createEscrow(
      productId, farmer.address, ONE_DAY, false, { value: PAYMENT }
    );
    const receipt = await tx.wait();
    const escrowId = receipt.logs.find(
      (l: any) => l.fragment?.name === "EscrowCreated"
    ).args.escrowId;

    await time.increase(ONE_DAY + 1);

    await paymentEscrow.connect(buyer).claimRefund(escrowId);
    expect(await paymentEscrow.balances(buyer.address)).to.equal(PAYMENT);
  });

  it("Payment fails if product not certified when certification required", async () => {
    // buyer requires certification but none has been issued
    const tx = await paymentEscrow.connect(buyer).createEscrow(
      productId, cooperative.address, ONE_DAY, true, { value: PAYMENT }
    );
    const receipt = await tx.wait();
    const escrowId = receipt.logs.find(
      (l: any) => l.fragment?.name === "EscrowCreated"
    ).args.escrowId;

    await expect(
      paymentEscrow.releasePayment(escrowId)
    ).to.be.revertedWith("Product is not certified");
  });

  it("Either party can raise a dispute", async () => {
    const tx = await paymentEscrow.connect(buyer).createEscrow(
      productId, cooperative.address, ONE_DAY, false, { value: PAYMENT }
    );
    const receipt = await tx.wait();
    const escrowId = receipt.logs.find(
      (l: any) => l.fragment?.name === "EscrowCreated"
    ).args.escrowId;

    await paymentEscrow.connect(buyer).raiseDispute(escrowId);
    const escrow = await paymentEscrow.getEscrow(escrowId);
    expect(escrow.status).to.equal(3); // Disputed
  });

  it("Seller can withdraw after payment is released", async () => {
    const tx = await paymentEscrow.connect(buyer).createEscrow(
      productId, cooperative.address, ONE_DAY, false, { value: PAYMENT }
    );
    const receipt = await tx.wait();
    const escrowId = receipt.logs.find(
      (l: any) => l.fragment?.name === "EscrowCreated"
    ).args.escrowId;

    await paymentEscrow.releasePayment(escrowId);

    const balanceBefore = await ethers.provider.getBalance(cooperative.address);
    await paymentEscrow.connect(cooperative).withdraw();
    const balanceAfter = await ethers.provider.getBalance(cooperative.address);

    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});
