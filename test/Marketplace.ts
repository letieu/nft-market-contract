import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { createListSignature } from "../helpers/market";

describe("Marketplace", function () {
  async function deploy() {
    const [owner, user1, user2, user3, user4] = await ethers.getSigners();
    const Marketplace = await ethers.getContractFactory("Marketplace");
    const Nft = await ethers.getContractFactory("NFTMock");

    const marketplace = await upgrades.deployProxy(Marketplace, [
      owner.address, // marketPayee
      500, // 5% fee for marketplace
    ]);
    const nft = await Nft.deploy("nft", "nft");
    const nft2 = await Nft.deploy("nft2", "nf2");

    await nft.mint(user1.address, 3); // user1: 1, 2, 3
    await nft.mint(user2.address, 1); // user2: 4
    await nft.mint(user3.address, 1); // user3: 5

    await nft2.mint(user1.address, 1); // user1: 1

    const chainId = 31337;
    return { marketplace, nft, owner, user1, user2, user3, nft2, user4, chainId };
  }

  describe("Deployment", function () {
    it("Should set the right market payee", async function () {
      const { marketplace, owner } = await deploy();
      expect(await marketplace.marketPayee()).to.equal(owner.address);
      expect(await marketplace.marketPercent()).to.equal(500);
    });

    it("Should set the right owner", async function () {
      const { marketplace, owner } = await deploy();
      expect(await marketplace.owner()).to.equal(owner.address);
    });

    it("Should have default royalty registry", async function () {
      const { marketplace } = await deploy();
      expect(await marketplace.royaltyRegistry()).to.equal(
        ethers.constants.AddressZero
      );
    });
  });

  describe("Setting", function () {
    it("Should set market payee", async function () {
      const { marketplace, owner, user1 } = await deploy();
      await marketplace.connect(owner).setMarketPayee(user1.address);
      expect(await marketplace.marketPayee()).to.equal(user1.address);
    });

    it("Should set market percent", async function () {
      const { marketplace, owner } = await deploy();
      await marketplace.connect(owner).setMarketPercent(10);
      expect(await marketplace.marketPercent()).to.equal(10);
    });

    it("Should set royalty registry", async function () {
      const { marketplace, owner, user1 } = await deploy();
      await marketplace.connect(owner).setRoyaltyRegistry(user1.address);
      expect(await marketplace.royaltyRegistry()).to.equal(user1.address);
    });

    it("Should setting only by owner", async function () {
      const { marketplace, user1 } = await deploy();
      await expect(
        marketplace.connect(user1).setMarketPayee(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        marketplace.connect(user1).setMarketPercent(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        marketplace.connect(user1).setRoyaltyRegistry(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("buyNFT", function () {
    describe("Validations", function () {
      it("Should revert if invalid signature length", async function () {
        const { marketplace, nft, user1, user2 } = await deploy();
        await expect(
          marketplace.connect(user1).buyNFT(
            {
              tokenAddress: nft.address,
              tokenId: 1,
              price: ethers.utils.parseEther("1"),
              seller: user2.address,
            },
            "0x"
          )
        ).to.be.revertedWith("ECDSA: invalid signature length");
      });

      it("Should revert if seller no more own NFT", async function () {
        const { marketplace, nft, user1, user2, chainId } = await deploy();

        const signature = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 4,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId,
        );

        await expect(
          marketplace.connect(user2).buyNFT(
            {
              tokenAddress: nft.address,
              tokenId: 4,
              price: ethers.utils.parseEther("1"),
              seller: user1.address,
            },
            signature,
            {
              value: ethers.utils.parseEther("1"),
            }
          )
        ).to.be.revertedWith("Seller not own nft");
      });

      it("Should revert if buyer change params", async function () {
        const { marketplace, nft, user1, user2, chainId } = await deploy();

        const signature = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 4,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId,
        );

        await expect(
          marketplace.connect(user2).buyNFT(
            {
              tokenAddress: nft.address,
              tokenId: 2,
              price: ethers.utils.parseEther("1"),
              seller: user1.address,
            },
            signature,
            {
              value: ethers.utils.parseEther("1"),
            }
          )
        ).to.be.revertedWith("Invalid signature");
      });

      it("Should revert if seller not approve NFT to market", async function () {
        const { marketplace, nft, user1, user2, chainId } = await deploy();

        const signature = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId,
        );

        await expect(
          marketplace.connect(user2).buyNFT(
            {
              tokenAddress: nft.address,
              tokenId: 1,
              price: ethers.utils.parseEther("1"),
              seller: user1.address,
            },
            signature,
            {
              value: ethers.utils.parseEther("1"),
            }
          )
        ).to.be.revertedWith("ERC721: caller is not token owner or approved");
      });

      it("Should revert if buyer not send enough value", async function () {
        const { marketplace, nft, user1, user2, chainId } = await deploy();

        const signature = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId,
        );

        await expect(
          marketplace.connect(user2).buyNFT(
            {
              tokenAddress: nft.address,
              tokenId: 1,
              price: ethers.utils.parseEther("1"),
              seller: user1.address,
            },
            signature,
            {
              value: ethers.utils.parseEther("0.1"),
            }
          )
        ).to.be.revertedWith("Price not match");
      });
    });

    describe("Events", function () {
      it("Should emit NFTBought", async function () {
        const { marketplace, nft, user1, user2, chainId } = await deploy();

        await nft.connect(user1).setApprovalForAll(marketplace.address, true);

        const signature = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId,
        );

        await expect(
          marketplace.connect(user2).buyNFT(
            {
              tokenAddress: nft.address,
              tokenId: 1,
              price: ethers.utils.parseEther("1"),
              seller: user1.address,
            },
            signature,
            {
              value: ethers.utils.parseEther("1"),
            }
          )
        )
          .to.emit(marketplace, "NFTBought")
          .withArgs(
            user2.address,
            user1.address,
            nft.address,
            1,
            ethers.utils.parseEther("1")
          );
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the seller and market", async function () {
        const { marketplace, nft, user1, user2, owner, chainId } = await deploy();

        await nft.connect(user1).setApprovalForAll(marketplace.address, true);

        const signature = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId,
        );

        const value = ethers.utils.parseEther("1");
        const buy = marketplace.connect(user2).buyNFT(
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: value,
            seller: user1.address,
          },
          signature,
          {
            value,
          }
        );

        // user2: buyer | user1: seller | owner: market payee
        await expect(buy).to.changeEtherBalances(
          [user2, user1, owner],
          [
            ethers.utils.parseEther("-1"), // buyer pay 1 eth
            value.mul(95).div(100), // seller get 95% of 1 eth
            value.mul(5).div(100), // market get 5% of 1 eth
          ]
        );
      });

      it("Should transfer the funds to the seller, market, collection payee", async function () {
        const { marketplace, nft, user1, user2, user3, owner, chainId } = await deploy();
        // deploy royaltyRegistry
        const Royal = await ethers.getContractFactory("Royalty");
        const royaltyRegistry = await upgrades.deployProxy(Royal, []);
        await marketplace.setRoyaltyRegistry(royaltyRegistry.address);

        // register royal
        await royaltyRegistry.setRoyalty(nft.address, user3.address, 1000); // 10 %

        await nft.connect(user1).setApprovalForAll(marketplace.address, true);
        const signature = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId,
        );

        const value = ethers.utils.parseEther("1");
        const buy = marketplace.connect(user2).buyNFT(
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: value,
            seller: user1.address,
          },
          signature,
          {
            value,
          }
        );

        // user2: buyer | user1: seller | owner: marketPayee | user3: collection payee
        await expect(buy).to.changeEtherBalances(
          [user2, user1, user3, owner],
          [
            ethers.utils.parseEther("-1"), // buyer pay 1 eth
            value.mul(85).div(100), // seller get 85% of 1 eth
            value.mul(10).div(100), // collection get 10% of 1 eth
            value.mul(5).div(100), // market get 5% of 1 eth
          ]
        );
      });

      it("Should transfer the NFT to the buyer", async function () {
        const { marketplace, nft, user1, user2, chainId } = await deploy();

        await nft.connect(user1).setApprovalForAll(marketplace.address, true);

        const signature = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId,
        );

        await marketplace.connect(user2).buyNFT(
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          signature,
          {
            value: ethers.utils.parseEther("1"),
          }
        );

        expect(await nft.ownerOf(1)).to.equal(user2.address);
      });
    });
  });

  describe("buyBundle", function () {
    describe("Validations", function () {
      it("Should revert if pass empty", async function () {
        const { marketplace, user2 } = await deploy();

        await expect(
          marketplace.connect(user2).buyBundle([], [], {
            value: ethers.utils.parseEther("1"),
          })
        ).to.be.revertedWith("Empty listings");
      });

      it("Should revert if pass different length", async function () {
        const { marketplace, user2 } = await deploy();

        await expect(
          marketplace.connect(user2).buyBundle(
            [
              {
                tokenAddress: ethers.constants.AddressZero,
                tokenId: 1,
                price: ethers.utils.parseEther("1"),
                seller: ethers.constants.AddressZero,
              },
            ],
            [],
            {
              value: ethers.utils.parseEther("1"),
            }
          )
        ).to.be.revertedWith("Invalid length");
      });

      it("Should limit the number of listings", async function () {
        const { marketplace, user2 } = await deploy();

        await expect(
          marketplace.connect(user2).buyBundle(
            new Array(101).fill({
              tokenAddress: ethers.constants.AddressZero,
              tokenId: 1,
              price: ethers.utils.parseEther("1"),
              seller: ethers.constants.AddressZero,
            }),
            new Array(101).fill("0x"),
            {
              value: ethers.utils.parseEther("1"),
            }
          )
        ).to.be.revertedWith("20 listings max");
      });

      it("Should revert if pass invalid signature", async function () {
        const { marketplace, user2, nft, chainId } = await deploy();

        const signature = await createListSignature(
          user2,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user2.address,
          },
          chainId
        );

        await expect(
          marketplace.connect(user2).buyBundle(
            [
              {
                tokenAddress: ethers.constants.AddressZero,
                tokenId: 1,
                price: ethers.utils.parseEther("1"),
                seller: ethers.constants.AddressZero,
              },
            ],
            [signature],
            {
              value: ethers.utils.parseEther("1"),
            }
          )
        ).to.be.revertedWith("Invalid signature");
      });

      it("Should revert if pass invalid price", async function () {
        const { marketplace, user2, user1, nft, chainId } = await deploy();

        const signature1 = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId
        );
        const signature2 = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 2,
            price: ethers.utils.parseEther("2"),
            seller: user1.address,
          },
          chainId
        );

        await nft.connect(user1).approve(marketplace.address, 1);
        await nft.connect(user1).approve(marketplace.address, 2);

        await expect(
          marketplace.connect(user2).buyBundle(
            [
              {
                tokenAddress: nft.address,
                tokenId: 1,
                price: ethers.utils.parseEther("1"),
                seller: user1.address,
              },
              {
                tokenAddress: nft.address,
                tokenId: 2,
                price: ethers.utils.parseEther("2"),
                seller: user1.address,
              },
            ],
            [signature1, signature2],
            {
              value: ethers.utils.parseEther("0.5"),
            }
          )
        ).to.be.revertedWith("Price not match");
      });
    });

    describe("Events", function () {
      it("Should emit many NFTBought event", async function () {
        const { marketplace, user2, user1, nft, chainId } = await deploy();

        const signature1 = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId
        );
        const signature2 = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 2,
            price: ethers.utils.parseEther("2"),
            seller: user1.address,
          },
          chainId
        );

        await nft.connect(user1).approve(marketplace.address, 1);
        await nft.connect(user1).approve(marketplace.address, 2);

        await expect(
          marketplace.connect(user2).buyBundle(
            [
              {
                tokenAddress: nft.address,
                tokenId: 1,
                price: ethers.utils.parseEther("1"),
                seller: user1.address,
              },
              {
                tokenAddress: nft.address,
                tokenId: 2,
                price: ethers.utils.parseEther("2"),
                seller: user1.address,
              },
            ],
            [signature1, signature2],
            {
              value: ethers.utils.parseEther("3"),
            }
          )
        )
          .to.emit(marketplace, "NFTBought")
          .withArgs(
            user2.address,
            user1.address,
            nft.address,
            1,
            ethers.utils.parseEther("1")
          )
          .to.emit(marketplace, "NFTBought")
          .withArgs(
            user2.address,
            user1.address,
            nft.address,
            2,
            ethers.utils.parseEther("2")
          );
      });
    });

    describe("Transfer", function () {
      it("Should transfer NFTs", async function () {
        const { marketplace, user2, user1, nft, chainId } = await deploy();

        const signature1 = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId
        );
        const signature2 = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 2,
            price: ethers.utils.parseEther("2"),
            seller: user1.address,
          },
          chainId
        );

        await nft.connect(user1).approve(marketplace.address, 1);
        await nft.connect(user1).approve(marketplace.address, 2);

        await marketplace.connect(user2).buyBundle(
          [
            {
              tokenAddress: nft.address,
              tokenId: 1,
              price: ethers.utils.parseEther("1"),
              seller: user1.address,
            },
            {
              tokenAddress: nft.address,
              tokenId: 2,
              price: ethers.utils.parseEther("2"),
              seller: user1.address,
            },
          ],
          [signature1, signature2],
          {
            value: ethers.utils.parseEther("3"),
          }
        );

        expect(await nft.ownerOf(1)).to.equal(user2.address);
        expect(await nft.ownerOf(2)).to.equal(user2.address);
      });

      it("Should transfer Fund", async function () {
        const { marketplace, user2, user1, user3, nft, nft2, owner, user4, chainId } =
          await deploy();

        // deploy royaltyRegistry
        const Royal = await ethers.getContractFactory("Royalty");
        const royaltyRegistry = await upgrades.deployProxy(Royal, []);
        await marketplace.setRoyaltyRegistry(royaltyRegistry.address);

        // set royal for nft
        await royaltyRegistry.setRoyalty(nft.address, user4.address, 2000);

        const signature1 = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId
        );
        const signature2 = await createListSignature(
          user3,
          marketplace.address,
          {
            tokenAddress: nft.address,
            tokenId: 5,
            price: ethers.utils.parseEther("2"),
            seller: user3.address,
          },
          chainId
        );

        const signature3 = await createListSignature(
          user1,
          marketplace.address,
          {
            tokenAddress: nft2.address,
            tokenId: 1,
            price: ethers.utils.parseEther("1"),
            seller: user1.address,
          },
          chainId
        );

        await nft.connect(user1).approve(marketplace.address, 1);
        await nft2.connect(user1).approve(marketplace.address, 1);
        await nft.connect(user3).approve(marketplace.address, 5);

        const buy = marketplace.connect(user2).buyBundle(
          [
            {
              tokenAddress: nft.address,
              tokenId: 1,
              price: ethers.utils.parseEther("1"),
              seller: user1.address,
            },
            {
              tokenAddress: nft.address,
              tokenId: 5,
              price: ethers.utils.parseEther("2"),
              seller: user3.address,
            },
            {
              tokenAddress: nft2.address,
              tokenId: 1,
              price: ethers.utils.parseEther("1"),
              seller: user1.address,
            },
          ],
          [signature1, signature2, signature3],
          {
            value: ethers.utils.parseEther("4"),
          }
        );

        // market should have 5% of 4 eth
        await expect(buy).to.changeEtherBalance(
          owner,
          ethers.utils.parseEther("4").mul(5).div(100)
        );
        // user1: seller of signature1 and signature3. 75% of 1 eth and 95% of 1 eth = 1.7 eth
        await expect(buy).to.changeEtherBalance(
          user1,
          ethers.utils.parseEther("1.7")
        );

        // user3: seller of signature2. 75% of 2 eth = 1.5 eth
        await expect(buy).to.changeEtherBalance(
          user3,
          ethers.utils.parseEther("1.5")
        );

        // user4: payee of collection 1
        await expect(buy).to.changeEtherBalance(
          user4,
          ethers.utils.parseEther("3").mul(20).div(100)
        );
      });
    });
  });
});
