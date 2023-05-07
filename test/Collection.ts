import { expect } from "chai";
import { ethers } from "hardhat";

describe("Collection", function () {
  async function deploy() {
    const [user1, user2, user3, user4] = await ethers.getSigners();
    const Nft = await ethers.getContractFactory("Collection");

    const nft = await Nft.deploy("nft", "nft");
    const nft2 = await Nft.deploy("nft2", "nf2");

    return { nft, nft2, user1, user2, user3, user4 };
  }

  describe("Deploy", async function () {
    it("Should set the right market payee", async function () {
      const { nft, nft2, user1 } = await deploy();
      expect(await nft.name()).to.equal("nft");
      expect(await nft.symbol()).to.equal("nft");

      expect(await nft2.name()).to.equal("nft2");
      expect(await nft2.symbol()).to.equal("nf2");

      expect(await nft.owner()).to.equal(user1.address);
      expect(await nft2.owner()).to.equal(user1.address);
    });
  });

  describe("Mint", async function () {
    it("Should mint one", async function () {
      const { nft, user1, user2 } = await deploy();

      await nft.mint(user1.address, "https://ipfs.io/1234");
      expect(await nft.balanceOf(user1.address)).to.equal(1);
      expect(await nft.tokenURI(1)).to.equal("https://ipfs.io/1234");
      expect(await nft.ownerOf(1)).to.equal(user1.address);

      await nft.mint(user2.address, "https://ipfs.io/5678");
      expect(await nft.balanceOf(user2.address)).to.equal(1);
      expect(await nft.tokenURI(2)).to.equal("https://ipfs.io/5678");
      expect(await nft.ownerOf(2)).to.equal(user2.address);

      expect(await nft.totalSupply()).to.equal(2);
    });

    it("Should mint many", async function () {
      const { nft, user2 } = await deploy();
      await nft.mintMany(user2.address, ["https://ipfs.io/1", "https://ipfs.io/2", "https://ipfs.io/3"]);

      expect(await nft.balanceOf(user2.address)).to.equal(3);
      expect(await nft.tokenURI(1)).to.equal("https://ipfs.io/1");
      expect(await nft.ownerOf(1)).to.equal(user2.address);

      expect(await nft.tokenURI(2)).to.equal("https://ipfs.io/2");
      expect(await nft.ownerOf(2)).to.equal(user2.address);

      expect(await nft.tokenURI(3)).to.equal("https://ipfs.io/3");
      expect(await nft.ownerOf(3)).to.equal(user2.address);

      expect(await nft.totalSupply()).to.equal(3);
    });
  });
});
