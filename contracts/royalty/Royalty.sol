// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import './IRoyalty.sol';

contract Royalty is IRoyalty, Initializable, OwnableUpgradeable {

  function initialize() public initializer {
    __Ownable_init();
  }

  mapping(address => address) public collectionPayee;
  mapping(address => uint16) public collectionRoyalty;

  function getCollectionPayee(address _collection) external view override returns (address) {
    return collectionPayee[_collection];
  }

  function getCollectionRoyalty(address _collection) external view override returns (uint16) {
    return collectionRoyalty[_collection];
  }

  function setRoyalty(address _collection, address _payee, uint16 _royalty) external override onlyOwner {
    require(_royalty <= 10000, "Royalty must be less than 10000");
    collectionPayee[_collection] = _payee;
    collectionRoyalty[_collection] = _royalty;
    emit CollectionRegistered(_collection, _payee, _royalty);
  }

  function setRoyaltyByCollectionOwner(address _collection, address _payee, uint16 _royalty) external {
    require(_royalty <= 10000, "Royalty must be less than 10000");
    require(Ownable(_collection).owner() == msg.sender, "Only collection owner can set royalty");
    collectionPayee[_collection] = _payee;
    collectionRoyalty[_collection] = _royalty;
    emit CollectionRegistered(_collection, _payee, _royalty);
  }
}
