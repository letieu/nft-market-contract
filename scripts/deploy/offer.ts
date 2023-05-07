import { ethers, upgrades } from "hardhat";

async function main() {
  const marketPayee = process.env.MARKET_PAYEE;
  const marketPercent = process.env.MARKET_PERCENT;
  const paymentToken = process.env.OFFER_PAYMENT_TOKEN;

  if (!marketPayee || !marketPercent || !paymentToken) {
    throw new Error("MARKET_PAYEE and MARKET_PERCENT and OFFER_PAYMENT_TOKEN must be set");
  }

  const Offer = await ethers.getContractFactory("Offer");
  const offer = await upgrades.deployProxy(Offer, [marketPayee, marketPercent, paymentToken]);
  await offer.deployed();

  console.log('Deployed offer');
  console.table({
    address: offer.address,
    implementation: await upgrades.erc1967.getImplementationAddress(offer.address),
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
