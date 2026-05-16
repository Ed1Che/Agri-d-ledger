import { configVariable, defineConfig } from "hardhat/config";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import "@nomicfoundation/hardhat-toolbox-viem"; 
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Hardhat 3 Configuration
 * 
 * We use 'defineConfig' to get full TypeScript support for the config object.
 * The '@nomicfoundation/hardhat-toolbox-viem' plugin automatically handles
 * integration with the Node.js native test runner and Hardhat Ignition.
 */
export default defineConfig({
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    // sources: "./contracts",
    tests: "./test",
    // cache: "./cache",
    // artifacts: "./artifacts",
  },
  networks: {
    /**
     * Hardhat 3 introduced 'edr-simulated' networks for in-process testing.
     * These are the default for local development.
     */
    hardhat: {
      type: "edr-simulated",
      chainType: "l1", // Standard L1 simulation
    },
    
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op", // Optimism/L2 simulation
    },

    /**
     * JSON-RPC Networks (Testnets & Mainnet)
     * Using 'configVariable' allows Hardhat to securely pull from .env or its own storage.
     */
    sepolia: {
      type: "http",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },

    polygon: {
      type: "http",
      url: configVariable("POLYGON_RPC_URL"),
      accounts: [configVariable("POLYGON_PRIVATE_KEY")],
    },

    mumbai: {
      type: "http",
      url: configVariable("MUMBAI_RPC_URL"),
      accounts: [configVariable("MUMBAI_PRIVATE_KEY")],
    },
  },

});
