import { expect } from "chai";
import { ethers } from "hardhat";

describe("ProductRegistry", function () {
  let identityRegistry: any;
  let productRegistry: any;
  let owner: any, farmer: any, nonFarmer: any;
  let FARMER_ROLE: string;

  beforeEach(async () => {
    [owner, farmer, nonFarmer] = await ethers.getSigners();

    // Deploy IdentityRegistry
    const Registry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await Registry.deploy();

    // Deploy ProductRegistry with IdentityRegistry address
    const Product = await ethers.getContractFactory("ProductRegistry");
    productRegistry = await Product.deploy(await identityRegistry.getAddress());

    // Register farmer
    FARMER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FARMER_ROLE"));
    await identityRegistry.registerParticipant(
      farmer.address,
      FARMER_ROLE,
      "John Kamau",
      "Nyeri"
    );
  });

  it("Registered farmer can record a harvest", async () => {
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmTest"));

    const tx = await productRegistry.connect(farmer).registerProduct(
      "Coffee",
      500,
      1738800000,
      "-0.416,36.948",
      metadataHash
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.fragment?.name === "ProductRegistered"
    );
    expect(event).to.not.be.undefined;
    expect(event.args.farmer).to.equal(farmer.address);
    expect(event.args.quantity).to.equal(500n);
  });

  it("Unregistered address cannot record a harvest", async () => {
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmTest"));

    await expect(
      productRegistry.connect(nonFarmer).registerProduct(
        "Coffee", 500, 1738800000, "-0.416,36.948", metadataHash
      )
    ).to.be.revertedWith("Caller is not a registered farmer");
  });

  it("Product ID is unique per transaction", async () => {
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmTest"));

    const tx1 = await productRegistry.connect(farmer).registerProduct(
      "Coffee", 500, 1738800000, "-0.416,36.948", metadataHash
    );
    const tx2 = await productRegistry.connect(farmer).registerProduct(
      "Coffee", 500, 1738800000, "-0.416,36.948", metadataHash
    );

    const r1 = await tx1.wait();
    const r2 = await tx2.wait();

    const id1 = r1.logs.find((l: any) => l.fragment?.name === "ProductRegistered").args.productId;
    const id2 = r2.logs.find((l: any) => l.fragment?.name === "ProductRegistered").args.productId;

    expect(id1).to.not.equal(id2);
  });

  it("Farmer can retrieve their registered products", async () => {
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmTest"));

    await productRegistry.connect(farmer).registerProduct(
      "Coffee", 500, 1738800000, "-0.416,36.948", metadataHash
    );

    const products = await productRegistry.getFarmerProducts(farmer.address);
    expect(products.length).to.equal(1);
  });

  it("Product metadata hash is stored correctly", async () => {
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmTest"));

    const tx = await productRegistry.connect(farmer).registerProduct(
      "Coffee", 500, 1738800000, "-0.416,36.948", metadataHash
    );
    const receipt = await tx.wait();
    const productId = receipt.logs.find(
      (l: any) => l.fragment?.name === "ProductRegistered"
    ).args.productId;

    const product = await productRegistry.getProduct(productId);
    expect(product.metadataHash).to.equal(metadataHash);
    expect(product.productType).to.equal("Coffee");
    expect(product.quantity).to.equal(500n);
  });
});