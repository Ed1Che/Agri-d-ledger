import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();
const reportHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmLabReport"));

describe("QualityVerification", function () {
  let identityRegistry: any, productRegistry: any, qualityVerification: any;
  let owner: any, farmer: any, regulator: any, lab: any, stranger: any;
  let FARMER_ROLE: string, REGULATOR_ROLE: string;
  let productId: string;

  beforeEach(async () => {
    [owner, farmer, regulator, lab, stranger] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await Registry.deploy();

    const Product = await ethers.getContractFactory("ProductRegistry");
    productRegistry = await Product.deploy(await identityRegistry.getAddress());

    const Quality = await ethers.getContractFactory("QualityVerification");
    qualityVerification = await Quality.deploy(
      await identityRegistry.getAddress(),
      await productRegistry.getAddress()
    );

    FARMER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FARMER_ROLE"));
    REGULATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGULATOR_ROLE"));

    await identityRegistry.registerParticipant(farmer.address, FARMER_ROLE, "John", "Nyeri");
    await identityRegistry.registerParticipant(regulator.address, REGULATOR_ROLE, "KEBS", "Nairobi");

    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://test"));
    const tx = await productRegistry.connect(farmer).registerProduct(
      "Coffee", 500, 1738800000, "-0.416,36.948", metadataHash
    );
    const receipt = await tx.wait();
    productId = receipt.logs.find(
      (l: any) => l.fragment?.name === "ProductRegistered"
    ).args.productId;
  });

  it("Farmer can submit a self-claim report", async () => {
    await qualityVerification.connect(farmer).submitFarmerClaim(
      productId, 200, 1200, reportHash
    );
    const report = await qualityVerification.getLatestReport(productId);
    expect(report.tier).to.equal(0); // FarmerClaim
    expect(report.meetsStandards).to.be.true;
  });

  it("Report correctly flags product that fails standards", async () => {
    await qualityVerification.connect(farmer).submitFarmerClaim(
      productId, 600, 1200, reportHash  // 600 PPB exceeds MAX of 500
    );
    const report = await qualityVerification.getLatestReport(productId);
    expect(report.meetsStandards).to.be.false;
  });

  it("Regulator can accredit a lab", async () => {
    await qualityVerification.connect(regulator).addAccreditedLab(lab.address);
    expect(await qualityVerification.accreditedLabs(lab.address)).to.be.true;
  });

  it("Accredited lab report auto-issues certificate when standards met", async () => {
    await qualityVerification.connect(regulator).addAccreditedLab(lab.address);
    await qualityVerification.connect(lab).submitLabReport(
      productId, 200, 1200, reportHash  // within limits
    );
    expect(await qualityVerification.isProductCertified(productId)).to.be.true;
    const cert = await qualityVerification.getCertificate(productId);
    expect(cert.certificateType).to.equal("Organic");
  });

  it("Lab report does NOT issue certificate when standards fail", async () => {
    await qualityVerification.connect(regulator).addAccreditedLab(lab.address);
    await qualityVerification.connect(lab).submitLabReport(
      productId, 600, 1200, reportHash  // exceeds pesticide limit
    );
    expect(await qualityVerification.isProductCertified(productId)).to.be.false;
  });

  it("Regulator can revoke a certificate", async () => {
    await qualityVerification.connect(regulator).addAccreditedLab(lab.address);
    await qualityVerification.connect(lab).submitLabReport(productId, 200, 1200, reportHash);
    await qualityVerification.connect(regulator).revokeCertificate(productId, "Fraud detected");
    expect(await qualityVerification.isProductCertified(productId)).to.be.false;
  });

  it("Non-accredited lab cannot submit lab report", async () => {
    await expect(
      qualityVerification.connect(stranger).submitLabReport(productId, 200, 1200, reportHash)
    ).to.be.revertedWithCustomError(qualityVerification, "NotAccreditedLab");
  });
});
