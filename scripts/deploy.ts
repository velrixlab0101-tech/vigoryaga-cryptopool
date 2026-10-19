import { network } from "hardhat";

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
  const { ethers } = await network.connect();

  const chain = await ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);
  const isMainnet = chainId === 8453;
  const usdcAddress = isMainnet ? USDC_BASE : USDC_BASE_SEPOLIA;

  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No signer: set PRIVATE_KEY in your environment");

  console.log(`Deploying RaffleVault to chain ${chainId} (${isMainnet ? "base" : "baseSepolia"})...`);
  console.log("Deployer:", deployer.address);
  console.log("USDC:", usdcAddress);

  const Vault = await ethers.getContractFactory("RaffleVault");
  const vault = await Vault.deploy(usdcAddress);
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log("\nRaffleVault deployed to:", address);
  console.log(`Add to .env: NEXT_PUBLIC_RAFFLE_VAULT=${address}`);
  console.log("Owner (operator fee recipient):", await vault.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
