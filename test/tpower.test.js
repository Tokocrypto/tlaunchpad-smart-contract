const { assert } = require("chai");
const truffleAssert = require('truffle-assertions');

const TKOToken = artifacts.require('TKOToken');
const TPower = artifacts.require('TKOPower');

contract('TPower', function (accounts) {

    let instance_tko;
    let instance_tpower;
    var mulDecimals;
    var delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    before(async function () {
        instance_tko = await TKOToken.deployed();
        instance_tpower = await TPower.deployed();
        assert.deepEqual(await instance_tpower.name(), "TKO Power");
        assert.deepEqual(await instance_tpower.symbol(), "TKO-POWER");
        mulDecimals = 10 ** 18;
        await instance_tpower.setLockPeriod(15);
        await instance_tpower.setClaimLockPeriod(15);
    });

    it('1. Lock', async () => {
        const totalSupply = await instance_tko.totalSupply();
        await instance_tko.increaseAllowance(instance_tpower.address, totalSupply);
        await truffleAssert.fails(instance_tpower.lock(BigInt(1 * mulDecimals))); // Amount less than 100 TKO
        truffleAssert.eventEmitted(await instance_tpower.lock(BigInt(100 * mulDecimals)), 'onLock');
        assert.deepEqual(Number(await instance_tpower.balanceOf(accounts[0])), Number(1 * mulDecimals));
    });

    it('2. Unlock', async () => {
        await truffleAssert.fails(instance_tpower.unlock(), "Lock Period Not Passed");
        const lockPeriod = await instance_tpower.lockPeriod();
        const stakeTime = await instance_tpower.stakeTime(accounts[0]);
        const timestampNow1 = Number((new Date().getTime() / 1000).toFixed(0));
        const timeoutLockPeriod = Number(lockPeriod) + Number(stakeTime) + 3 - timestampNow1;
        await delay(timeoutLockPeriod * 1000);
        truffleAssert.eventEmitted(await instance_tpower.unlock(), 'onUnlock');
    });

    it('3. Claim', async () => {
        await truffleAssert.fails(instance_tpower.claim(), "Claim Locked Period Not Passed");
        const claimLockPeriod = await instance_tpower.claimLockPeriod();
        const claimTime = await instance_tpower.claimTime(accounts[0]);
        const timestampNow1 = Number((new Date().getTime() / 1000).toFixed(0));
        const timeoutclaimLockPeriod = Number(claimLockPeriod) + Number(claimTime) + 3 - timestampNow1;
        await delay(timeoutclaimLockPeriod * 1000);
        truffleAssert.eventEmitted(await instance_tpower.claim(), 'onClaim');
    });

    it('4. Transfer', async () => {
        const amount = Number(100 * mulDecimals);
        assert.deepEqual(Number(await instance_tpower.balanceOf(accounts[0])), 0);
        assert.deepEqual(Number(await instance_tpower.stakedAmount(accounts[0])), 0);
        truffleAssert.eventEmitted(await instance_tpower.lock(BigInt(amount)), 'onLock');
        assert.deepEqual(Number(await instance_tpower.balanceOf(accounts[0])), amount / 100);
        assert.deepEqual(Number(await instance_tpower.stakedAmount(accounts[0])), amount);
        await truffleAssert.fails(instance_tpower.transfer(accounts[1], 100), "Minimum amount 1 TKO-POWER"); // on wei
        await truffleAssert.fails(instance_tpower.transfer(accounts[1], BigInt(amount / 100)), "Sender or receiver no proxy address");
        truffleAssert.eventEmitted(await instance_tpower.setProxyAddressBatch([accounts[1]], true), 'ProxyAddress');
        truffleAssert.eventEmitted(await instance_tpower.transfer(accounts[1], BigInt(amount / 100)), 'Transfer');
        assert.deepEqual(Number(await instance_tpower.balanceOf(accounts[0])), 0);
        assert.deepEqual(Number(await instance_tpower.stakedAmount(accounts[0])), 0);
        assert.deepEqual(Number(await instance_tpower.balanceOf(accounts[1])), amount / 100);
        assert.deepEqual(Number(await instance_tpower.stakedAmount(accounts[1])), amount);
    });

});