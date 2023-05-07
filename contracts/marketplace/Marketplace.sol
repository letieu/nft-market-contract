// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../royalty/IRoyalty.sol";
import './IMarketplace.sol';

contract Marketplace is Initializable, EIP712Upgradeable, IMarketplace, ReentrancyGuardUpgradeable, OwnableUpgradeable {
  using SafeMathUpgradeable for uint256;
  using SafeMathUpgradeable for uint16;

  IRoyalty public royaltyRegistry;
  address public marketPayee;
  uint16 public marketPercent;

  function initialize(address _payee, uint16 _percent) public initializer {
    __EIP712_init("Marketplace", "1.0.0");
    __Ownable_init();
    __ReentrancyGuard_init();
    marketPayee = _payee;
    marketPercent = _percent;
  }

  // == SETTING ===========================================================
  function setRoyaltyRegistry(address _royaltyRegistry) external onlyOwner {
    royaltyRegistry = IRoyalty(_royaltyRegistry);
  }

  function setMarketPayee(address _payee) external onlyOwner {
    marketPayee = _payee;
  }

  function setMarketPercent(uint16 _percent) external onlyOwner {
    require(_percent <= 10000, "percent must be less than 10000");
    marketPercent = _percent;
  }

  // == FEATURES ==========================================================
  function buyNFT(IMarketplace.Listing calldata _listing, bytes calldata _signature) external payable nonReentrant {
    address seller = ECDSAUpgradeable.recover(_hashListing(_listing), _signature);

    require(seller == _listing.seller, 'Invalid signature');
    require(IERC721(_listing.tokenAddress).ownerOf(_listing.tokenId) == seller, "Seller not own nft");
    require(msg.value == _listing.price, "Price not match");

    IERC721(_listing.tokenAddress).transferFrom(seller, msg.sender, _listing.tokenId);

    // extract fee
    uint256 marketRevenue = msg.value.mul(marketPercent).div(10000);
    payable(marketPayee).transfer(marketRevenue);

    _payout(_listing, msg.sender);
  
    emit NFTBought(msg.sender, seller, _listing.tokenAddress, _listing.tokenId, _listing.price);
  }

  function buyBundle(
    IMarketplace.Listing[] calldata _listings,
    bytes[] calldata _signatures
  ) external payable nonReentrant {
    require(_listings.length == _signatures.length, "Invalid length");
    require(_listings.length > 0, "Empty listings");
    require(_listings.length <= 20, "20 listings max");

    uint256 total = 0;
    for (uint256 i = 0; i < _listings.length; i++) {
      address seller = ECDSAUpgradeable.recover(_hashListing(_listings[i]), _signatures[i]);
      require(seller == _listings[i].seller, 'Invalid signature');
      require(IERC721(_listings[i].tokenAddress).ownerOf(_listings[i].tokenId) == seller, "Seller not own nft");
      total = total.add(_listings[i].price);
    }

    require(msg.value == total, "Price not match");

    // extract fee
    uint256 marketRevenue = msg.value.mul(marketPercent).div(10000);
    payable(marketPayee).transfer(marketRevenue);

    for (uint256 i = 0; i < _listings.length; i++) {
      IERC721(_listings[i].tokenAddress).transferFrom(_listings[i].seller, msg.sender, _listings[i].tokenId);
      _payout(_listings[i], msg.sender);
      emit NFTBought(msg.sender, _listings[i].seller, _listings[i].tokenAddress, _listings[i].tokenId, _listings[i].price);
    }
  }

  // == HELPERS ===========================================================

  function _payout(IMarketplace.Listing calldata _listing, address _buyer) internal {
    uint256 balance = _listing.price.sub(_listing.price.mul(marketPercent).div(10000));

    // pay for collection payee
    if (address(royaltyRegistry) != address(0)) {
      address collectionPayee = royaltyRegistry.getCollectionPayee(_listing.tokenAddress);
      uint16 collectionRoyalty = royaltyRegistry.getCollectionRoyalty(_listing.tokenAddress);
      if (collectionPayee != address(0) && collectionRoyalty > 0) {
        uint256 collectionRevenue = _listing.price.mul(collectionRoyalty).div(10000);
        payable(collectionPayee).transfer(collectionRevenue);
        balance = balance.sub(collectionRevenue);
      }
    }

    // pay for _seller
    payable(_listing.seller).transfer(balance);
  }


  function _hashListing(IMarketplace.Listing calldata _listing) private view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(
          abi.encode(
            keccak256("ListParams(address tokenAddress,uint256 tokenId,uint256 price,address seller)"),
            _listing.tokenAddress,
            _listing.tokenId,
            _listing.price,
            _listing.seller
          )
        )
      );
  }

}
