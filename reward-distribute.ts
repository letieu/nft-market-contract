import { ethers } from "ethers";
import { keccak256 } from "ethers/lib/utils";
import { MerkleTree } from "merkletreejs";

export type WhitelistItem = {
  address: string;
  totalNft: number;
};

export function createMerkleTree(whitelist: WhitelistItem[]) {
  const leaves = whitelist.map((x) =>
    ethers.utils.solidityKeccak256(
      ["address", "uint256"],
      [x.address, x.totalNft]
    )
  );

  const tree = new MerkleTree(leaves, keccak256, { sort: true });
  const proofs = leaves.map(leaf=> tree.getHexProof(leaf))
  return {
    tree,
    proofs
  }
}
