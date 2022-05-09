const IDOFactory = artifacts.require('IDOFactory');
const TKOToken = artifacts.require('TKOToken');
const BUSD = artifacts.require('BUSD');
const TPower = artifacts.require('TKOPower');

module.exports = async function (deployer, network, addresses) {
  await deployer.deploy(TKOToken);
  await deployer.deploy(BUSD);
  const tkoToken = await TKOToken.deployed();
  await tkoToken.mint(addresses[0], BigInt(100000000 * (10 ** 18)));
  await deployer.deploy(IDOFactory, addresses[0]);
  const idoFactory = await IDOFactory.deployed();
  const opsRole = await idoFactory.OPS_ROLE();
  idoFactory.grantRole(opsRole, addresses[0]);
  await deployer.deploy(TPower, tkoToken.address);
};
