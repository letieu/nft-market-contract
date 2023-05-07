// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// Simple NFT Collection Smart Contract

contract NFTMock is ERC721, Ownable {
    using Counters for Counters.Counter;

    uint256 maxSupply = 10000;

    Counters.Counter private _tokenIdCounter;

    constructor(string memory _name, string memory _symbol)
    ERC721(_name, _symbol)
    {}

    function mint(address _user, uint256 _amount) public {
        for (uint256 i; i < _amount; i++) {
            _tokenIdCounter.increment();
            uint256 tokenId = _tokenIdCounter.current();
            _safeMint(_user, tokenId);
        }
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
