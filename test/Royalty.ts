import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("Royalty", function () {
  async function deploy() {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    const Royalty = await ethers.getContractFactory("Royalty");
    const Nft = await ethers.getContractFactory("NFTMock");

    const proxy = await upgrades.deployProxy(Royalty, []);
    const nft = await Nft.deploy("nft", "nft");

    const royalty = await ethers.getContractAt('IRoyalty', proxy.address);

    return { royalty, nft, owner, user1, user2, user3, proxy };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { proxy, owner } = await loadFixture(deploy);
      expect(await proxy.owner()).to.equal(owner.address);
    });
  });

  describe("Set royal", function () {
    describe("Validations", function () {
      it("Should revert if not owner", async function () {
        const { royalty, nft, user1 } = await loadFixture(deploy);
        await expect(
          royalty.connect(user1).setRoyalty(nft.address, user1.address, 1)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Should revert if pass invalid royal", async function () {
        const { royalty, nft, user1 } = await loadFixture(deploy);
        await expect(
          royalty.setRoyalty(nft.address, user1.address, 10001)
        ).to.be.revertedWith("Royalty must be less than 10000");
      });
    });

    describe("Events", function () {
      it("Should emit CollectionRegistered", async function () {
        const { royalty, nft, user1 } = await loadFixture(deploy);
        await expect(royalty.setRoyalty(nft.address, user1.address, 1))
          .to.emit(royalty, "CollectionRegistered")
          .withArgs(nft.address, user1.address, 1);
      });
    });

    describe("Set value", function () {
      it ("Should set value", async function () {
        const { royalty, nft, user1 } = await loadFixture(deploy);
        await royalty.setRoyalty(nft.address, user1.address, 1);
        expect(await royalty.getCollectionRoyalty(nft.address)).to.equal(1);
        expect(await royalty.getCollectionPayee(nft.address)).to.equal(user1.address);
      });

      it ("Should return default value", async function () {
        const { royalty, nft } = await loadFixture(deploy);
        expect(await royalty.getCollectionRoyalty(nft.address)).to.equal(0);
        expect(await royalty.getCollectionPayee(nft.address)).to.equal(ethers.constants.AddressZero);
      });
    });
  });
});
