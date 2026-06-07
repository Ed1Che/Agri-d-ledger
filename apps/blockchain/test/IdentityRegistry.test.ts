import { expect } from "chai";
import { network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

const { ethers } = await network.create();

describe("IdentityRegistry", function () {
  let registry: any;
  let owner: any;
  let farmer: any;
  const FARMER_ROLE = keccak256(toUtf8Bytes("FARMER_ROLE"));

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    farmer = signers[1];

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    registry = await IdentityRegistry.deploy();
    await registry.waitForDeployment();
  });

  it("Should register a farmer", async function () {
    await registry.connect(owner).registerParticipant(
      farmer.address,
      FARMER_ROLE,
      "John Kamau",
      "Nyeri"
    );

    const hasRole = await registry.hasRole(FARMER_ROLE, farmer.address);
    expect(hasRole).to.be.true;
  });

  it("Should reject registration from non-admin", async function () {
    await expect(
      registry.connect(farmer).registerParticipant(
        farmer.address,
        FARMER_ROLE,
        "John",
        "Nyeri"
      )
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
  });
});
