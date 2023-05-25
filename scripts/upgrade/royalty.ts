import { ethers, upgrades } from "hardhat";

async function main() {
  const royalAddress = process.env.ROYALTY_ADDRESS;
  if (!royalAddress) {
    throw new Error("ROYALTY_ADDRESS is not set");
  }
  const Royalty = await ethers.getContractFactory("Royalty");
  // upgrade proxy
  const royal = await upgrades.upgradeProxy(royalAddress, Royalty);
  await royal.deployed();

  console.log('Upgraded royalty');
  console.log(Date());
  console.table({
    address: royal.address,
    implementation: await upgrades.erc1967.getImplementationAddress(royal.address),
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
