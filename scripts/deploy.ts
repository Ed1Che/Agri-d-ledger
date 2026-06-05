import { ethers } from "hardhat";

async function main() {
  console.log("Deploying contracts...");

  // Deploy IdentityRegistry
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const registry = await IdentityRegistry.deploy();
  await registry.waitForDeployment();
  console.log("IdentityRegistry deployed to:", await registry.getAddress());

  // Deploy Counter
  const Counter = await ethers.getContractFactory("Counter");
  const counter = await Counter.deploy();
  await counter.waitForDeployment();
  console.log("Counter deployed to:", await counter.getAddress());
  
   // 2. Deploy ProductRegistry — pass IdentityRegistry address
  const Product = await ethers.getContractFactory("ProductRegistry");
  const productRegistry = await Product.deploy(registryAddress);
  await productRegistry.waitForDeployment();
  console.log("ProductRegistry deployed to:", await productRegistry.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
