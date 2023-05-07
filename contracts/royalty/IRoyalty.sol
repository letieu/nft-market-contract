// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// contract for register collection royalty
// one collection can have only one royalty, one payee
// royalty is in basis points (percent * 100), e.g. 10000 = 100%
interface IRoyalty {
  function getCollectionPayee(address) external view returns (address);
  function getCollectionRoyalty(address) external view returns (uint16);
  function setRoyalty(address _collection, address _payee, uint16 _royalty) external;

  event CollectionRegistered(address indexed _collection, address indexed _payee, uint16 _royalty);
}
