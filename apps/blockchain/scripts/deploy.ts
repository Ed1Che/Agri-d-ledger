import { network, tasks } from "hardhat";

const conn = await network.create();
const { ethers } = conn;

async function verify(address: string, constructorArgs: unknown[]) {
  if (conn.networkName === "hardhat" || conn.networkName === "localhost") return;
  console.log(`\nVerifying ${address} on ${conn.networkName}...`);
  try {
    await tasks.getTask(["verify", "verify"]).run({
      address,
      constructorArguments: constructorArgs,
    });
    console.log("  ✓ Verified");
  } catch (err: any) {
    if (err.message.includes("Already Verified")) {
      console.log("  ✓ Already verified");
    } else {
      console.warn("  ⚠ Verification failed:", err.message);
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\nDeploying to: ${conn.networkName}`);
  console.log(`Deployer:     ${deployer.address}`);
  console.log(`Balance:      ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // 1. IdentityRegistry
  console.log("1/5  Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const registry = await IdentityRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log(`     IdentityRegistry → ${registryAddr}`);
  await verify(registryAddr, []);

  // 2. ProductRegistry
  console.log("2/5  Deploying ProductRegistry...");
  const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
  const productRegistry = await ProductRegistry.deploy(registryAddr);
  await productRegistry.waitForDeployment();
  const productAddr = await productRegistry.getAddress();
  console.log(`     ProductRegistry   → ${productAddr}`);
  await verify(productAddr, [registryAddr]);

  // 3. ChainOfCustody
  console.log("3/5  Deploying ChainOfCustody...");
  const ChainOfCustody = await ethers.getContractFactory("ChainOfCustody");
  const custodyContract = await ChainOfCustody.deploy(registryAddr, productAddr);
  await custodyContract.waitForDeployment();
  const custodyAddr = await custodyContract.getAddress();
  console.log(`     ChainOfCustody    → ${custodyAddr}`);
  await verify(custodyAddr, [registryAddr, productAddr]);

  // 4. QualityVerification
  console.log("4/5  Deploying QualityVerification...");
  const QualityVerification = await ethers.getContractFactory("QualityVerification");
  const qualityContract = await QualityVerification.deploy(registryAddr, productAddr);
  await qualityContract.waitForDeployment();
  const qualityAddr = await qualityContract.getAddress();
  console.log(`     QualityVerification → ${qualityAddr}`);
  await verify(qualityAddr, [registryAddr, productAddr]);

  // 5. PaymentEscrow
  console.log("5/5  Deploying PaymentEscrow...");
  const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
  const escrow = await PaymentEscrow.deploy(registryAddr, custodyAddr, qualityAddr);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log(`     PaymentEscrow     → ${escrowAddr}`);
  await verify(escrowAddr, [registryAddr, custodyAddr, qualityAddr]);

  console.log(`\n${"─".repeat(60)}`);
  console.log("Deployment complete. Add these to your .env:\n");
  console.log(`IDENTITY_REGISTRY_ADDRESS=${registryAddr}`);
  console.log(`PRODUCT_REGISTRY_ADDRESS=${productAddr}`);
  console.log(`CHAIN_OF_CUSTODY_ADDRESS=${custodyAddr}`);
  console.log(`QUALITY_VERIFICATION_ADDRESS=${qualityAddr}`);
  console.log(`PAYMENT_ESCROW_ADDRESS=${escrowAddr}`);
  console.log(`${"─".repeat(60)}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
