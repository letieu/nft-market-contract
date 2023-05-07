import { ethers, upgrades } from "hardhat";

async function main() {
  const marketPayee = process.env.MARKET_PAYEE;
  const marketPercent = process.env.MARKET_PERCENT;

  if (!marketPayee || !marketPercent) {
    throw new Error("MARKET_PAYEE and MARKET_PERCENT must be set");
  }

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await upgrades.deployProxy(Marketplace, [marketPayee, marketPercent]);
  await marketplace.deployed();

  console.log('Deployed marketplace');
  console.table({
    address: marketplace.address,
    implementation: await upgrades.erc1967.getImplementationAddress(marketplace.address),
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
