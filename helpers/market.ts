import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

export type ListParams = {
  tokenAddress: string;
  tokenId: number;
  price: BigNumber;
  seller: string;
};

export function createListSignature(
  wallet: SignerWithAddress,
  contractAddress: string,
  params: ListParams,
  chainId: number,
): Promise<string> {
  const domain = {
    name: "Marketplace",
    version: "1.0.0",
    chainId,
    verifyingContract: contractAddress,
  };
  const types = {
    ListParams: [
      { name: "tokenAddress", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "seller", type: "address" },
    ],
  };

  return wallet._signTypedData(domain, types, params);
}
