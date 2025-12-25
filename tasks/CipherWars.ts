import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the CipherWars address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const cipherWars = await deployments.get("CipherWars");

  console.log("CipherWars address is " + cipherWars.address);
});

task("task:join", "Join the CipherWars game and mint encrypted gold").setAction(
  async function (_taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const signers = await ethers.getSigners();

    const cipherWarsDeployment = await deployments.get("CipherWars");
    console.log(`CipherWars: ${cipherWarsDeployment.address}`);

    const contract = await ethers.getContractAt("CipherWars", cipherWarsDeployment.address);
    const tx = await contract.connect(signers[0]).joinGame();
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  },
);

task("task:construct", "Encrypt a building type and construct it")
  .addParam("type", "Building type id (1-4)")
  .addOptionalParam("address", "Optionally specify the CipherWars contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    const buildingType = parseInt(taskArguments.type);
    if (![1, 2, 3, 4].includes(buildingType)) {
      throw new Error("Building type must be between 1 and 4");
    }

    await fhevm.initializeCLIApi();

    const cipherWarsDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("CipherWars");
    console.log(`CipherWars: ${cipherWarsDeployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("CipherWars", cipherWarsDeployment.address);

    const encryptedInput = await fhevm
      .createEncryptedInput(cipherWarsDeployment.address, signers[0].address)
      .add32(buildingType)
      .encrypt();

    const tx = await contract
      .connect(signers[0])
      .constructBuilding(encryptedInput.handles[0], encryptedInput.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("task:decrypt-balance", "Decrypt an encrypted balance")
  .addOptionalParam("address", "Optionally specify the CipherWars contract address")
  .addOptionalParam("player", "Player address to decrypt balance for (defaults to signer[0])")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const cipherWarsDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("CipherWars");
    console.log(`CipherWars: ${cipherWarsDeployment.address}`);

    const signers = await ethers.getSigners();
    const player = taskArguments.player ?? signers[0].address;
    const contract = await ethers.getContractAt("CipherWars", cipherWarsDeployment.address);

    const encryptedBalance = await contract.getBalance(player);
    if (encryptedBalance === ethers.ZeroHash) {
      console.log("Balance is empty");
      return;
    }

    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      cipherWarsDeployment.address,
      signers[0],
    );

    console.log(`Encrypted balance: ${encryptedBalance}`);
    console.log(`Clear balance    : ${clearBalance}`);
  });

task("task:decrypt-building", "Decrypt a stored building type")
  .addOptionalParam("address", "Optionally specify the CipherWars contract address")
  .addOptionalParam("player", "Player address to decrypt building for (defaults to signer[0])")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const cipherWarsDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("CipherWars");
    console.log(`CipherWars: ${cipherWarsDeployment.address}`);

    const signers = await ethers.getSigners();
    const player = taskArguments.player ?? signers[0].address;
    const contract = await ethers.getContractAt("CipherWars", cipherWarsDeployment.address);

    const encryptedBuilding = await contract.getBuilding(player);
    if (encryptedBuilding === ethers.ZeroHash) {
      console.log("No building recorded");
      return;
    }

    const clearBuilding = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedBuilding,
      cipherWarsDeployment.address,
      signers[0],
    );

    console.log(`Encrypted building: ${encryptedBuilding}`);
    console.log(`Clear building    : ${clearBuilding}`);
  });
