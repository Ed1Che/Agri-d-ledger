import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
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
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.SEPOLIA_PRIVATE_KEY ?
        [process.env.SEPOLIA_PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: process.env.POLYGON_PRIVATE_KEY ?
        [process.env.POLYGON_PRIVATE_KEY] : [],
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || "",
      accounts: process.env.AMOY_PRIVATE_KEY ?
        [process.env.AMOY_PRIVATE_KEY] : [],
    },
  },
};

export default config;
