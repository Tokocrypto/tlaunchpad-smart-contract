import { expect } from "chai";
import { ethers } from "hardhat";

describe("TKOPower", function () {
    let accounts: any;
    let instance_tko: any;
    let instance_tpower: any;
    var mulDecimals: number;
    var delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    before(async function () {
        accounts = await ethers.getSigners();
        instance_tko = await (await ethers.getContractFactory("TKOToken")).deploy();
        await instance_tko.deployed();
        instance_tpower = await (await ethers.getContractFactory("TKOPower")).deploy(instance_tko.address);
        await instance_tpower.deployed();

        mulDecimals = 10 ** 18;
        await instance_tko['mint(address,uint256)'](accounts[0].address, BigInt(100000000 * mulDecimals));
        await instance_tpower.setLockPeriod(15);
        await instance_tpower.setClaimLockPeriod(15);
        expect(await instance_tpower.name()).to.equal("TKO Power");
        expect(await instance_tpower.symbol()).to.equal("TKO-POWER");
    });

    it('1. Lock', async () => {
        const totalSupply = await instance_tko.totalSupply();
        await instance_tko.increaseAllowance(instance_tpower.address, totalSupply);
        await expect(instance_tpower.lock(BigInt(mulDecimals))).to.be.reverted; // Amount less than 100 TKO
        const amountLock = BigInt(100 * mulDecimals);
        await expect(instance_tpower.lock(amountLock))
        .to.emit(instance_tpower, 'onLock')
        .withArgs(accounts[0].address, amountLock);
        expect(await instance_tpower.balanceOf(accounts[0].address)).to.equal(BigInt(mulDecimals));
    });

    it('2. Transfer', async () => {
        await expect(instance_tpower.transfer(accounts[1].address, BigInt(100 * mulDecimals)))
        .to.be.revertedWith("Transfer disable");
    });

    it('3. Unlock', async () => {
        await expect(instance_tpower.unlock()).to.be.revertedWith("Lock Period Not Passed");
        const lockPeriod = await instance_tpower.lockPeriod();
        const stakeTime = await instance_tpower.stakeTime(accounts[0].address);
        const timestampNow = Number((new Date().getTime() / 1000).toFixed(0));
        const timeoutLockPeriod = Number(lockPeriod) + Number(stakeTime) + 3 - timestampNow;
        await delay(timeoutLockPeriod * 1000);
        await expect(instance_tpower.unlock())
        .to.emit(instance_tpower, 'onUnlock')
        .withArgs(accounts[0].address, await instance_tpower.stakedAmount(accounts[0].address));
    });

    it('4. Claim', async () => {
        await expect(instance_tpower.claim()).to.be.revertedWith("Claim Locked Period Not Passed");
        const claimLockPeriod = await instance_tpower.claimLockPeriod();
        const claimTime = await instance_tpower.claimTime(accounts[0].address);
        const timestampNow = Number((new Date().getTime() / 1000).toFixed(0));
        const timeoutclaimLockPeriod = Number(claimLockPeriod) + Number(claimTime) + 3 - timestampNow;
        await delay(timeoutclaimLockPeriod * 1000);
        await expect(instance_tpower.claim())
        .to.emit(instance_tpower, 'onClaim')
        .withArgs(accounts[0].address, await instance_tpower.stakedAmount(accounts[0].address));
    });
});
