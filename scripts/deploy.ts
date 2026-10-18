async function main() {
  const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  const { ethers } = require("hardhat");
  
  const network = await ethers.provider.getNetwork();
  const isMainnet = Number(network.chainId) === 8453;
  const usdcAddress = isMainnet ? USDC_BASE : USDC_BASE_SEPOLIA;
  
  const Vault = await ethers.getContractFactory("RaffleVault");
  const vault = await Vault.deploy(usdcAddress);
  await vault.waitForDeployment();
  
  console.log("RaffleVault deployed to:", await vault.getAddress());
  console.log("USDC:", usdcAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
