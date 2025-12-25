import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedCipherWars = await deploy("CipherWars", {
    from: deployer,
    log: true,
  });

  console.log(`CipherWars contract: `, deployedCipherWars.address);
};
export default func;
func.id = "deploy_cipherWars"; // id required to prevent reexecution
func.tags = ["CipherWars"];
