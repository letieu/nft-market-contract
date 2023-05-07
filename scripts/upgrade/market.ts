import { ethers, upgrades } from "hardhat";

async function main() {
  const marketAddress = process.env.MARKET_ADDRESS;
  if (!marketAddress) {
    throw new Error("MARKET_ADDRESS is not set");
  }
  const Marketplace = await ethers.getContractFactory("Marketplace");
  // upgrade proxy
  const market = await upgrades.upgradeProxy(marketAddress, Marketplace);
  await market.deployed();

  console.log('Upgraded market');
  console.log(Date());
  console.table({
    address: market.address,
    implementation: await upgrades.erc1967.getImplementationAddress(market.address),
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
