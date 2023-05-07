import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { caeateOfferSignature, OfferParams } from "../helpers/offer";

describe("Offer", function () {
  async function deploy() {
    const [owner, user1, user2, user3, payee] = await ethers.getSigners();
    const Offer = await ethers.getContractFactory("Offer");
    const Nft = await ethers.getContractFactory("NFTMock");
    const Erc20 = await ethers.getContractFactory("ERC20Mock");

    const nft = await Nft.deploy("nft", "nft");
    const paymentToken = await Erc20.deploy("erc20", "erc20");
    const offer = await upgrades.deployProxy(Offer, [payee.address, 250, paymentToken.address]);

    const chainId = 31337;

    // transfer token to
    await paymentToken.transfer(user1.address, ethers.utils.parseEther("100"));
    await paymentToken.transfer(user2.address, ethers.utils.parseEther("100"));

    return { offer, nft, owner, user1, user2, user3, payee, chainId, paymentToken };
  }

  describe("Deployment", function () {
    it("Should set the right market payee", async function () {
      const { offer, payee } = await deploy();
      expect(await offer.marketPayee()).to.equal(payee.address);
      expect(await offer.marketPercent()).to.equal(250);
    });

    it("Should set the right owner", async function () {
      const { offer, owner } = await deploy();
      expect(await offer.owner()).to.equal(owner.address);
    });

    it("Should have default royalty registry", async function () {
      const { offer } = await deploy();
      expect(await offer.royaltyRegistry()).to.equal(
        ethers.constants.AddressZero
      );
    });
  });

  describe("Setting", function () {
    it("Should set market payee", async function () {
      const { offer, owner, user1 } = await deploy();
      await offer.connect(owner).setMarketPayee(user1.address);
      expect(await offer.marketPayee()).to.equal(user1.address);
    });

    it("Should set market percent", async function () {
      const { offer, owner } = await deploy();
      await offer.connect(owner).setMarketPercent(10);
      expect(await offer.marketPercent()).to.equal(10);
    });

    it("Should set royalty registry", async function () {
      const { offer, owner, user1 } = await deploy();
      await offer.connect(owner).setRoyaltyRegistry(user1.address);
      expect(await offer.royaltyRegistry()).to.equal(user1.address);
    });

    it("Should set payment token", async function () {
      // TODO
    });
    it("Should setting only by owner", async function () {
      const { offer, user1 } = await deploy();
      await expect(
        offer.connect(user1).setMarketPayee(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        offer.connect(user1).setMarketPercent(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        offer.connect(user1).setRoyaltyRegistry(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Accept offer", function () {
    describe("Validations", function () {
      it("Should revert if not NFT owner", async function () {
        const { offer, user1, user2, nft, chainId } = await deploy();
        await nft.mint(user1.address, 1);
        await nft.mint(user2.address, 2);

        const offerParams: OfferParams = {
          tokenAddress: nft.address,
          tokenId: 1,
          price: ethers.utils.parseEther("1"),
          bidder: user2.address,
        };
        const signature = await caeateOfferSignature(
          user2,
          offer.address,
          offerParams,
          chainId
        );

        await expect(
          offer.connect(user2).acceptOffer(offerParams, signature)
        ).to.be.revertedWith("not own nft");
      });

      it("Should revert if invalid signature", async function () {
        const { offer, user1, user2, nft, chainId } = await deploy();
        await nft.mint(user1.address, 1);

        const offerParams: OfferParams = {
          tokenAddress: nft.address,
          tokenId: 1,
          price: ethers.utils.parseEther("1"),
          bidder: user2.address,
        };
        const signature = await caeateOfferSignature(
          user2,
          offer.address,
          {
            ...offerParams,
            price: ethers.utils.parseEther("2"),
          },
          chainId
        );

        await expect(
          offer.connect(user1).acceptOffer(offerParams, signature)
        ).to.be.revertedWith("invalid signature");
      });

      it("Should revert if not approve NFT", async function () {
        const { offer, user1, user2, nft, chainId } = await deploy();
        await nft.mint(user1.address, 1);

        const offerParams: OfferParams = {
          tokenAddress: nft.address,
          tokenId: 1,
          price: ethers.utils.parseEther("1"),
          bidder: user2.address,
        };
        const signature = await caeateOfferSignature(
          user2,
          offer.address,
          offerParams,
          chainId
        );

        await expect(
          offer.connect(user1).acceptOffer(offerParams, signature)
        ).to.be.revertedWith("ERC721: caller is not token owner or approved");
      });

      it("Should revert if not enough token balance", async function () {
        const { offer, user1, user2, nft, chainId, paymentToken } = await deploy();
        await nft.mint(user1.address, 1);
        await nft.connect(user1).approve(offer.address, 1);

        await paymentToken.connect(user1).approve(offer.address, ethers.utils.parseEther("1"));

        const offerParams: OfferParams = {
          tokenAddress: nft.address,
          tokenId: 1,
          price: ethers.utils.parseEther("1"),
          bidder: user2.address,
        };
        const signature = await caeateOfferSignature(
          user2,
          offer.address,
          offerParams,
          chainId
        );

        await expect(
          offer.connect(user1).acceptOffer(offerParams, signature)
        ).to.be.revertedWith("ERC20: insufficient allowance");
      });

      it("Should revert if not enough token allowance", async function () {
        const { offer, user1, user2, nft, chainId, paymentToken } = await deploy();
        await nft.mint(user2.address, 1);
        await nft.connect(user2).approve(offer.address, 1);

        const offerParams: OfferParams = {
          tokenAddress: nft.address,
          tokenId: 1,
          price: ethers.utils.parseEther("1"),
          bidder: user1.address,
        };
        const signature = await caeateOfferSignature(
          user1,
          offer.address,
          offerParams,
          chainId
        );

        await expect(
          offer.connect(user2).acceptOffer(offerParams, signature)
        ).to.be.revertedWith("ERC20: insufficient allowance");
      });
    });

    describe("Transfer", function () {
      it("Should transfer NFT to bidder", async function () {
        const { offer, user1, user2, nft, chainId, paymentToken } = await deploy();
        await nft.mint(user1.address, 1);
        await nft.connect(user1).approve(offer.address, 1);

        // create offer
        await paymentToken.connect(user2).approve(offer.address, ethers.utils.parseEther("1"));

        const offerParams: OfferParams = {
          tokenAddress: nft.address,
          tokenId: 1,
          price: ethers.utils.parseEther("1"),
          bidder: user2.address,
        };

        // accept offer
        const signature = await caeateOfferSignature(
          user2,
          offer.address,
          offerParams,
          chainId
        );

        await offer.connect(user1).acceptOffer(offerParams, signature);

        expect(await nft.ownerOf(1)).to.equal(user2.address);
      });

      it("Should transfer funds to seller and market payee", async function () {
        const { offer, user1, user2, nft, chainId, paymentToken, payee } =
          await deploy();
        await nft.mint(user1.address, 1);
        await nft.connect(user1).approve(offer.address, 1);

        // create offer
        await paymentToken.connect(user2).approve(offer.address, ethers.utils.parseEther("1"));

        const offerParams: OfferParams = {
          tokenAddress: nft.address,
          tokenId: 1,
          price: ethers.utils.parseEther("1"),
          bidder: user2.address,
        };

        // accept offer
        const signature = await caeateOfferSignature(
          user2,
          offer.address,
          offerParams,
          chainId
        );

        const acceptOffer = offer
          .connect(user1)
          .acceptOffer(offerParams, signature);
        await acceptOffer;

        // balance
        await expect(acceptOffer).to.changeTokenBalances(
          paymentToken,
          [user2, user1, payee],
          [
            ethers.utils.parseEther("-1"),
            ethers.utils.parseEther("0.975"),
            ethers.utils.parseEther("0.025"),
          ]
        );
      });

      it("Should transfer funds to seller, market payee, collection payee", async function () {
        const { offer, user1, user2, nft, chainId, paymentToken, payee, user3 } =
          await deploy();
        await nft.mint(user1.address, 1);
        await nft.connect(user1).approve(offer.address, 1);

        const Royal = await ethers.getContractFactory("Royalty");
        const royaltyRegistry = await upgrades.deployProxy(Royal, []);
        await offer.setRoyaltyRegistry(royaltyRegistry.address);
        await royaltyRegistry.setRoyalty(nft.address, user3.address, 1000); // 10 %

        // create offer
        await paymentToken.connect(user2).approve(offer.address, ethers.utils.parseEther("1"));

        const offerParams: OfferParams = {
          tokenAddress: nft.address,
          tokenId: 1,
          price: ethers.utils.parseEther("1"),
          bidder: user2.address,
        };

        // accept offer
        const signature = await caeateOfferSignature(
          user2,
          offer.address,
          offerParams,
          chainId
        );

        const acceptOffer = offer
          .connect(user1)
          .acceptOffer(offerParams, signature);
        await acceptOffer;

        await expect(acceptOffer).to.changeTokenBalances(
          paymentToken,
          [user2, user1, payee, user3],
          [
            ethers.utils.parseEther("-1"),
            ethers.utils.parseEther("0.875"),
            ethers.utils.parseEther("0.025"),
            ethers.utils.parseEther("0.1"),
          ]
        );
      });
    });

    describe("Emit event", function () {
      it("Should emit OfferAccepted event", async function () {
        const { offer, user1, user2, nft, chainId, paymentToken } = await deploy();
        await nft.mint(user1.address, 1);
        await nft.connect(user1).approve(offer.address, 1);

        // create offer
        await paymentToken.connect(user2).approve(offer.address, ethers.utils.parseEther("1"));

        const offerParams: OfferParams = {
          tokenAddress: nft.address,
          tokenId: 1,
          price: ethers.utils.parseEther("1"),
          bidder: user2.address,
        };

        // accept offer
        const signature = await caeateOfferSignature(
          user2,
          offer.address,
          offerParams,
          chainId
        );

        await expect(offer.connect(user1).acceptOffer(offerParams, signature))
          .to.emit(offer, "OfferAccepted")
          .withArgs(
            nft.address,
            1,
            ethers.utils.parseEther("1"),
            user2.address,
            user1.address
          );
      });
    });
  });
});
