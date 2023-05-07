# Sample Market Project Contract

## Contract list:

1. Collection.sol: Contract for NFT collection, use to mint NFT
2. Marketplace.sol: The main contract for the marketplace, use to buy and sell NFT
4. Offer.sol: Contract for offer NFT
3. Royalty.sol: Contract for royalty setup

## Setup

```shell
# Install dependencies
pnpm install # npm install

# Create .env file
cp .env.example .env

# Add more network config to hardhat.config.ts
```

## Deploy contract to a network

```shell

# Add private key to .env file, you can get private key from metamask
# Add config to .env file

# Deploy marketplace
npx hardhat run scripts/deploy/marketplace.ts --network mumbai

# Deploy offer
npx hardhat run scripts/deploy/offer.ts --network mumbai

# Deploy royalty
npx hardhat run scripts/deploy/royalty.ts --network mumbai
```

## Verify contract

```shell
npx hardhat verify --network mumbai DEPLOYED_CONTRACT_ADDRESS
```

## Get contract ABI

```shell
# ABI will be exported to abi folder
npx hardhat export-abi
```
