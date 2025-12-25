import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, deployments, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { CipherWars } from "../types";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("CipherWarsSepolia", function () {
  let signers: Signers;
  let cipherWarsContract: CipherWars;
  let cipherWarsContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const cipherWarsDeployment = await deployments.get("CipherWars");
      cipherWarsContractAddress = cipherWarsDeployment.address;
      cipherWarsContract = await ethers.getContractAt("CipherWars", cipherWarsDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("joins and constructs a building on Sepolia", async function () {
    steps = 10;

    this.timeout(4 * 40000);

    progress("Joining the game...");
    let tx = await cipherWarsContract.connect(signers.alice).joinGame();
    await tx.wait();

    progress("Encrypting building type '2'...");
    const encryptedTwo = await fhevm
      .createEncryptedInput(cipherWarsContractAddress, signers.alice.address)
      .add32(2)
      .encrypt();

    progress("Constructing building type 2...");
    tx = await cipherWarsContract
      .connect(signers.alice)
      .constructBuilding(encryptedTwo.handles[0], encryptedTwo.inputProof);
    await tx.wait();

    progress("Fetching encrypted balance...");
    const encryptedBalance = await cipherWarsContract.getBalance(signers.alice.address);
    expect(encryptedBalance).to.not.eq(ethers.ZeroHash);

    progress("Decrypting balance...");
    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      cipherWarsContractAddress,
      signers.alice,
    );
    progress(`Clear balance: ${clearBalance}`);

    progress("Fetching encrypted building...");
    const encryptedBuilding = await cipherWarsContract.getBuilding(signers.alice.address);
    expect(encryptedBuilding).to.not.eq(ethers.ZeroHash);

    progress("Decrypting building type...");
    const clearBuilding = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedBuilding,
      cipherWarsContractAddress,
      signers.alice,
    );
    progress(`Clear building: ${clearBuilding}`);

    expect(clearBuilding).to.eq(2);
    expect(clearBalance).to.eq(9_800);
  });
});
