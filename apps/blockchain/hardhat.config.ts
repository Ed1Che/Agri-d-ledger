import "dotenv/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL ?? "",
      accounts: process.env.SEPOLIA_PRIVATE_KEY
        ? [`0x${process.env.SEPOLIA_PRIVATE_KEY.replace(/^0x/, "")}`]
        : [],
      chainId: 11155111,
    },
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL ?? "",
      accounts: process.env.POLYGON_PRIVATE_KEY
        ? [`0x${process.env.POLYGON_PRIVATE_KEY.replace(/^0x/, "")}`]
        : [],
      chainId: 137,
    },
    amoy: {
      type: "http",
      url: process.env.AMOY_RPC_URL ?? "",
      accounts: process.env.AMOY_PRIVATE_KEY
        ? [`0x${process.env.AMOY_PRIVATE_KEY.replace(/^0x/, "")}`]
        : [],
      chainId: 80002,
    },
  },
});
