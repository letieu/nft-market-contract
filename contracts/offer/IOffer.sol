// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// smart contract interface for the Offer NFT
// need Escrow contract to hold the funds
interface IOffer {

  struct Offer {
    address tokenAddress;
    uint256 tokenId;
    uint256 price;
    address bidder;
  }

  function acceptOffer(
    IOffer.Offer calldata _offer,
    bytes calldata _signature
  ) external;

  // == EVENTS ===========================================================
  event OfferAccepted(
    address indexed _tokenAddress,
    uint256 _tokenId,
    uint256 _price,
    address indexed _bidder,
    address indexed _seller
  );
}
