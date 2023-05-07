import { HardhatUserConfig } from "hardhat/config";
import '@openzeppelin/hardhat-upgrades';
import "@nomicfoundation/hardhat-toolbox";
import { config as envConfig } from "dotenv";

envConfig();

const accounts = [process.env.PRIVATE_KEY || ""];

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    goerli: {
      url: "https://rpc.ankr.com/eth_goerli",
      accounts,
      gasPrice: "auto",
    },
    mumbai: {
      url: "https://matic-mumbai.chainstacklabs.com",
      accounts,
      gasPrice: "auto",
    },
    polygon: {
      url: "https://polygon-bor.publicnode.com",
      accounts,
      gasPrice: "auto",
    },
    // TODO: add more networks here, get network info from https://chainlist.org/
  },
  etherscan: {
    apiKey: process.env.API_KEY,
  },
};

export default config;
