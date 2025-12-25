import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { CipherWars, CipherWars__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("CipherWars")) as CipherWars__factory;
  const cipherWarsContract = (await factory.deploy()) as CipherWars;
  const cipherWarsContractAddress = await cipherWarsContract.getAddress();

  return { cipherWarsContract, cipherWarsContractAddress };
}

describe("CipherWars", function () {
  let signers: Signers;
  let cipherWarsContract: CipherWars;
  let cipherWarsContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ cipherWarsContract, cipherWarsContractAddress } = await deployFixture());
  });

  it("returns empty encrypted values before joining", async function () {
    const encryptedBalance = await cipherWarsContract.getBalance(signers.alice.address);
    const encryptedBuilding = await cipherWarsContract.getBuilding(signers.alice.address);
    expect(encryptedBalance).to.eq(ethers.ZeroHash);
    expect(encryptedBuilding).to.eq(ethers.ZeroHash);
  });

  it("grants encrypted gold on join", async function () {
    const tx = await cipherWarsContract.connect(signers.alice).joinGame();
    await tx.wait();

    const encryptedBalance = await cipherWarsContract.getBalance(signers.alice.address);
    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      cipherWarsContractAddress,
      signers.alice,
    );

    const encryptedBuilding = await cipherWarsContract.getBuilding(signers.alice.address);
    const clearBuilding = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedBuilding,
      cipherWarsContractAddress,
      signers.alice,
    );

    expect(clearBalance).to.eq(10_000);
    expect(clearBuilding).to.eq(0);
  });

  it("stores encrypted building choice and deducts encrypted cost", async function () {
    await cipherWarsContract.connect(signers.alice).joinGame();

    const buildingType = 3;
    const encryptedChoice = await fhevm
      .createEncryptedInput(cipherWarsContractAddress, signers.alice.address)
      .add32(buildingType)
      .encrypt();

    const tx = await cipherWarsContract
      .connect(signers.alice)
      .constructBuilding(encryptedChoice.handles[0], encryptedChoice.inputProof);
    await tx.wait();

    const encryptedBalance = await cipherWarsContract.getBalance(signers.alice.address);
    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      cipherWarsContractAddress,
      signers.alice,
    );

    const encryptedBuilding = await cipherWarsContract.getBuilding(signers.alice.address);
    const clearBuilding = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedBuilding,
      cipherWarsContractAddress,
      signers.alice,
    );

    expect(clearBuilding).to.eq(buildingType);
    expect(clearBalance).to.eq(10_000 - 400);
  });
});
