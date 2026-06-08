import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  console.log("Deploying Agri-D-Ledger contracts...\n");

  // 1. IdentityRegistry
  const Registry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await Registry.deploy();
  await identityRegistry.waitForDeployment();
  const registryAddr = await identityRegistry.getAddress();
  console.log("IdentityRegistry deployed to:", registryAddr);

  // 2. ProductRegistry
  const Product = await ethers.getContractFactory("ProductRegistry");
  const productRegistry = await Product.deploy(registryAddr);
  await productRegistry.waitForDeployment();
  const productAddr = await productRegistry.getAddress();
  console.log("ProductRegistry deployed to:  ", productAddr);

  // 3. ChainOfCustody
  const Custody = await ethers.getContractFactory("ChainOfCustody");
  const chainOfCustody = await Custody.deploy(registryAddr, productAddr);
  await chainOfCustody.waitForDeployment();
  const custodyAddr = await chainOfCustody.getAddress();
  console.log("ChainOfCustody deployed to:   ", custodyAddr);

  // 4. QualityVerification
  const Quality = await ethers.getContractFactory("QualityVerification");
  const qualityVerification = await Quality.deploy(registryAddr, productAddr);
  await qualityVerification.waitForDeployment();
  const qualityAddr = await qualityVerification.getAddress();
  console.log("QualityVerification deployed to:", qualityAddr);

  // 5. PaymentEscrow
  const Escrow = await ethers.getContractFactory("PaymentEscrow");
  const paymentEscrow = await Escrow.deploy(registryAddr, custodyAddr, qualityAddr);
  await paymentEscrow.waitForDeployment();
  const escrowAddr = await paymentEscrow.getAddress();
  console.log("PaymentEscrow deployed to:    ", escrowAddr);

  // Save addresses to file for frontend use later
  const addresses = {
    network: "amoy",
    identityRegistry: registryAddr,
    productRegistry: productAddr,
    chainOfCustody: custodyAddr,
    qualityVerification: qualityAddr,
    paymentEscrow: escrowAddr,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));
  console.log("\nAddresses saved to deployed-addresses.json");
}

main().catch(console.error);
