import { describe, it, beforeEach } from "node:test";
import { expect } from "chai";
import { network } from "hardhat"; // Import network instead of hre
import { keccak256, toHex } from "viem";

describe("IdentityRegistry", async function () {
  // Hardhat 3 context extraction via the network object
  const { viem } = await network.create(); 

  let registry: any;
  let owner: any;
  let farmer: any;
  const FARMER_ROLE = keccak256(toHex("FARMER_ROLE"));

  beforeEach(async function () {
    const clients = await viem.getWalletClients();
    owner = clients[0];  
    farmer = clients[1]; 

    registry = await viem.deployContract("IdentityRegistry");
  });

  it("Should register a farmer", async function () {
    await registry.write.registerParticipant([
      farmer.account.address,
      FARMER_ROLE,
      "John Kamau",
      "Nyeri"
    ]);

    const hasRole = await registry.read.hasRole([FARMER_ROLE, farmer.account.address]);
    expect(hasRole).to.be.true;
  });

  it("Should reject registration from non-admin", async function () {
    try {
      await registry.write.registerParticipant([
        farmer.account.address,
        FARMER_ROLE,
        "John",
        "Nyeri"
      ], { account: farmer.account });
      expect.fail("Should have reverted");
    } catch (error: any) {
      expect(error.message).to.include("AccessControlUnauthorizedAccount");
    }
  });
});
