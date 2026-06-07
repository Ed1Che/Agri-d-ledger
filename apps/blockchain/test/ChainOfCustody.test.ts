import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("ChainOfCustody", function () {
  let identityRegistry: any, productRegistry: any, chainOfCustody: any;
  let owner: any, farmer: any, cooperative: any, stranger: any;
  let FARMER_ROLE: string, COOPERATIVE_ROLE: string;
  let productId: string;

  beforeEach(async () => {
    [owner, farmer, cooperative, stranger] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await Registry.deploy();

    const Product = await ethers.getContractFactory("ProductRegistry");
    productRegistry = await Product.deploy(await identityRegistry.getAddress());

    const Custody = await ethers.getContractFactory("ChainOfCustody");
    chainOfCustody = await Custody.deploy(
      await identityRegistry.getAddress(),
      await productRegistry.getAddress()
    );

    FARMER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FARMER_ROLE"));
    COOPERATIVE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COOPERATIVE_ROLE"));

    await identityRegistry.registerParticipant(farmer.address, FARMER_ROLE, "John", "Nyeri");
    await identityRegistry.registerParticipant(cooperative.address, COOPERATIVE_ROLE, "Coop A", "Nairobi");

    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://test"));
    const tx = await productRegistry.connect(farmer).registerProduct(
      "Coffee", 500, 1738800000, "-0.416,36.948", metadataHash
    );
    const receipt = await tx.wait();
    productId = receipt.logs.find(
      (l: any) => l.fragment?.name === "ProductRegistered"
    ).args.productId;

    await chainOfCustody.connect(farmer).initializeCustody(productId);
  });

  it("Farmer can initialize custody", async () => {
    expect(await chainOfCustody.getCurrentOwner(productId)).to.equal(farmer.address);
  });

  it("Farmer can initiate transfer to cooperative", async () => {
    await chainOfCustody.connect(farmer).initiateTransfer(productId, cooperative.address);
    expect(await chainOfCustody.pendingTransfer(productId)).to.equal(cooperative.address);
  });

  it("Cooperative can accept transfer", async () => {
    await chainOfCustody.connect(farmer).initiateTransfer(productId, cooperative.address);
    await chainOfCustody.connect(cooperative).acceptTransfer(productId, "-1.286,36.817", "Received in good condition");
    expect(await chainOfCustody.getCurrentOwner(productId)).to.equal(cooperative.address);
  });

  it("Custody history is recorded after transfer", async () => {
    await chainOfCustody.connect(farmer).initiateTransfer(productId, cooperative.address);
    await chainOfCustody.connect(cooperative).acceptTransfer(productId, "-1.286,36.817", "Good condition");
    const history = await chainOfCustody.getCustodyHistory(productId);
    // history[0] = initial custody record (address(0) → farmer), history[1] = transfer
    expect(history.length).to.equal(2);
    expect(history[1].from).to.equal(farmer.address);
    expect(history[1].to).to.equal(cooperative.address);
  });

  it("Stranger cannot initiate transfer", async () => {
    await expect(
      chainOfCustody.connect(stranger).initiateTransfer(productId, cooperative.address)
    ).to.be.revertedWithCustomError(chainOfCustody, "NotCurrentOwner");
  });
});
