// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// smart contract interface for the marketplace
// features:
// - create a new listing ( lazy listing)
// - buy a listing
// - buy bundle
interface IMarketplace {
  struct Listing {
    address tokenAddress;
    uint256 tokenId;
    uint256 price;
    address seller;
  }

  function buyNFT(
    IMarketplace.Listing calldata _listing,
    bytes calldata _signature
  ) external payable;

  function buyBundle(
    IMarketplace.Listing[] calldata _listings,
    bytes[] calldata _signatures
  ) external payable;

  // == EVENTS ===========================================================
  event NFTBought(
    address indexed _buyer,
    address indexed _seller,
    address indexed _tokenAddress,
    uint256 _tokenId,
    uint256 _price
  );
}
