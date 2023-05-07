import { ethers, upgrades } from "hardhat";

async function main() {
  const offerAddress = process.env.OFFER_ADDRESS;
  if (!offerAddress) {
    throw new Error("OFFER_ADDRESS is not set");
  }
  const Offer = await ethers.getContractFactory("Offer");
  // upgrade proxy
  const offer = await upgrades.upgradeProxy(offerAddress, Offer);
  await offer.deployed();

  console.log('Upgraded offer');
  console.log(Date());
  console.table({
    address: offer.address,
    implementation: await upgrades.erc1967.getImplementationAddress(offer.address),
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
