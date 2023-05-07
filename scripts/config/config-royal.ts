import { ethers, upgrades } from "hardhat";

async function main() {
  const marketAddress = process.env.MARKET_ADDRESS;
  const offerAddress = process.env.OFFER_ADDRESS;
  const royaltyAddress = process.env.ROYALTY_ADDRESS;

  if (!marketAddress || !royaltyAddress || !offerAddress) {
    throw new Error("MARKET_ADDRESS or ROYALTY_ADDRESS or OFFER_ADDRESS is not defined");
  }

  const market = await ethers.getContractAt("Marketplace", marketAddress);
  await market.setRoyaltyRegistry(royaltyAddress);

  const offer = await ethers.getContractAt("Offer", offerAddress);
  await offer.setRoyaltyRegistry(royaltyAddress);

  console.log('-----------------------------------');
  console.log('Config registry');
  console.log(Date());
  console.table({
    market: market.address,
    offer: offer.address,
    royalty: royaltyAddress,
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
