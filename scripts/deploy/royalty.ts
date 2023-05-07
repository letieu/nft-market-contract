import { ethers, upgrades } from "hardhat";

async function main() {
  const Royalty = await ethers.getContractFactory("Royalty");
  const royal = await upgrades.deployProxy(Royalty);
  await royal.deployed();

  console.log('Deployed royalty');
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
