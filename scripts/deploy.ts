// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const accounts = await ethers.getSigners();

  const tkoToken = await (await ethers.getContractFactory("TKOToken")).deploy();
  await tkoToken.deployed();
  await tkoToken.mint(accounts[0].address, BigInt(100000000 * (10 ** 18)));
  console.log("TKO Token deployed to: ", tkoToken.address);

  const busdToken = await (await ethers.getContractFactory("BUSD")).deploy();
  await busdToken.deployed();
  console.log("BUSD Token deployed to: ", busdToken.address);

  const idoFactory = await (await ethers.getContractFactory("IDOFactory")).deploy(accounts[0].address);
  await idoFactory.deployed();
  const opsRole = await idoFactory.OPS_ROLE();
  await idoFactory.grantRole(opsRole, accounts[0].address);
  console.log("IDO Factory deployed to: ", idoFactory.address);

  const tpower = await (await ethers.getContractFactory("TKOPower")).deploy(tkoToken.address);
  await tpower.deployed();
  console.log("TKO Power deployed to: ", tpower.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
