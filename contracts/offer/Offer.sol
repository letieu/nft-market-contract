// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../royalty/IRoyalty.sol";
import './IOffer.sol';

contract Offer is Initializable, IOffer , ReentrancyGuardUpgradeable, OwnableUpgradeable, EIP712Upgradeable {
  using SafeMathUpgradeable for uint256;
  using SafeMathUpgradeable for uint16;

  IRoyalty public royaltyRegistry;
  IERC20 public paymentToken;
  address public marketPayee;
  uint16 public marketPercent;

  function initialize(address _payee, uint16 _percent, IERC20 _paymentToken) public initializer {
    __EIP712_init("Offer", "1.0.0");
    __Ownable_init();
    __ReentrancyGuard_init();
    marketPayee = _payee;
    marketPercent = _percent;
    paymentToken = _paymentToken;
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

  function acceptOffer(
    IOffer.Offer calldata _offer,
    bytes calldata _signature) external nonReentrant {
    address bidder = ECDSAUpgradeable.recover(_hashOffer(_offer), _signature);

    require(bidder == _offer.bidder, 'invalid signature');
    require(IERC721(_offer.tokenAddress).ownerOf(_offer.tokenId) == msg.sender, "not own nft");

    // transfer nft to bidder
    IERC721(_offer.tokenAddress).transferFrom(msg.sender, bidder, _offer.tokenId);

    _payout(_offer.tokenAddress, _offer.price, _offer.bidder, msg.sender);
    emit OfferAccepted(_offer.tokenAddress, _offer.tokenId, _offer.price, _offer.bidder, msg.sender);
  }

  // == HELPERS ===========================================================

  function _payout(address _tokenAddress, uint256 _price, address _bidder, address _owner) internal {
    uint256 balance = _price.sub(_price.mul(marketPercent).div(10000));

    // extract market fee
    uint256 marketFee = _price.mul(marketPercent).div(10000);
    IERC20(paymentToken).transferFrom(_bidder, marketPayee, marketFee);

    // pay for collection payee
    if (address(royaltyRegistry) != address(0)) {
      address collectionPayee = royaltyRegistry.getCollectionPayee(_tokenAddress);
      uint16 collectionRoyalty = royaltyRegistry.getCollectionRoyalty(_tokenAddress);
      if (collectionPayee != address(0) && collectionRoyalty > 0) {
        uint256 collectionRevenue = _price.mul(collectionRoyalty).div(10000);
        IERC20(paymentToken).transferFrom(_bidder, collectionPayee, collectionRevenue);
        balance = balance.sub(collectionRevenue);
      }
    }

    IERC20(paymentToken).transferFrom(_bidder, _owner, balance);
  }

  function _hashOffer(IOffer.Offer calldata _offer) private view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(
          abi.encode(
            keccak256("OfferParams(address tokenAddress,uint256 tokenId,uint256 price,address bidder)"),
            _offer.tokenAddress,
            _offer.tokenId,
            _offer.price,
            _offer.bidder
          )
        )
      );
  }
}
