import { ethers } from "ethers";

const ADDRESSES = {
  identityRegistry:    "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  productRegistry:     "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
  chainOfCustody:      "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0",
  qualityVerification: "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
  paymentEscrow:       "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
};

const IDENTITY_ABI = [
  "function registerParticipant(address,bytes32,string,string) external",
  "function hasRole(bytes32,address) external view returns (bool)",
  "event ParticipantRegistered(address indexed participant, bytes32 role)"
];

const PRODUCT_ABI = [
  "function registerProduct(string,uint256,uint256,string,bytes32) external returns (bytes32)",
  "function getProduct(bytes32) external view returns (tuple(bytes32,address,string,uint256,uint256,string,bytes32,bool))",
  "function getFarmerProducts(address) external view returns (bytes32[])",
  "event ProductRegistered(bytes32 indexed productId, address indexed farmer, uint256 quantity)"
];

const CUSTODY_ABI = [
  "function initializeCustody(bytes32) external",
  "function initiateTransfer(bytes32,address) external",
  "function acceptTransfer(bytes32,string,string) external",
  "function getCurrentOwner(bytes32) external view returns (address)",
  "function getCustodyHistory(bytes32) external view returns (tuple(address,address,string,uint256,string)[])"
];

const QUALITY_ABI = [
  "function submitFarmerClaim(bytes32,uint256,uint256,bytes32) external",
  "function submitLabReport(bytes32,uint256,uint256,bytes32) external",
  "function isProductCertified(bytes32) external view returns (bool)",
  "function getCertificate(bytes32) external view returns (tuple(bytes32,string,uint8,uint256,address))"
];

const ESCROW_ABI = [
  "function createEscrow(bytes32,address,uint256,bool) external payable returns (bytes32)",
  "function releasePayment(bytes32) external",
  "function claimRefund(bytes32) external",
  "function raiseDispute(bytes32) external",
  "function withdraw() external",
  "function getEscrow(bytes32) external view returns (tuple(bytes32,address,address,uint256,uint256,bool,uint8,uint256))"
];

export async function getContracts() {
  if (!window.ethereum) throw new Error("MetaMask not found. Please install it.");
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return {
    signer,
    provider,
    address: await signer.getAddress(),
    identityRegistry:    new ethers.Contract(ADDRESSES.identityRegistry,    IDENTITY_ABI, signer),
    productRegistry:     new ethers.Contract(ADDRESSES.productRegistry,     PRODUCT_ABI,  signer),
    chainOfCustody:      new ethers.Contract(ADDRESSES.chainOfCustody,      CUSTODY_ABI,  signer),
    qualityVerification: new ethers.Contract(ADDRESSES.qualityVerification, QUALITY_ABI,  signer),
    paymentEscrow:       new ethers.Contract(ADDRESSES.paymentEscrow,       ESCROW_ABI,   signer),
  };
}
