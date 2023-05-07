import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

export type OfferParams = {
  tokenAddress: string;
  tokenId: number;
  price: BigNumber;
  bidder: string;
};

export function caeateOfferSignature(
  wallet: SignerWithAddress,
  contractAddress: string,
  params: OfferParams,
  chainId: number,
): Promise<string> {
  const domain = {
    name: "Offer",
    version: "1.0.0",
    chainId,
    verifyingContract: contractAddress,
  };
  const types = {
    OfferParams: [
      { name: "tokenAddress", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "bidder", type: "address" },
    ],
  };

  return wallet._signTypedData(domain, types, params);
}
