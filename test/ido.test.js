const { MerkleTree } = require('merkletreejs');
const Web3 = require('web3');
const { assert } = require("chai");
const truffleAssert = require('truffle-assertions');

const TKOToken = artifacts.require('TKOToken');
const BUSD = artifacts.require('BUSD');
const IDOFactory = artifacts.require('IDOFactory');
const IDO = artifacts.require('IDO');

contract('IDO Factory & IDO', function (accounts) {

    let instance_tko;
    let instance_busd;
    let instance_idofactory;
    let instance_ido1; // Raise Achieved, Has BUSD is True, Whitelisted, & Not Atomic Swap
    let instance_ido2; // Raise Not Achieved, Not Has BUSD, Not Whitelisted, & Not Atomic Swap
    let instance_ido3; // Raise Not Achieved, Not Has BUSD, Not Whitelisted, & Atomic Swap is True
    let listaddress;
    var initialize1;
    var initialize2;
    var initialize3;
    var mulDecimals;
    var merkleProof;
    var rootHash;
    var web3;
    var delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    before(async function () {
        instance_tko = await TKOToken.deployed();
        instance_busd = await BUSD.deployed();
        instance_idofactory = await IDOFactory.deployed();
        mulDecimals = 10 ** 18;
        let whitelistAddress = [accounts[1], accounts[2]];
        web3 = new Web3(instance_idofactory.contract._provider.host);
        const leafNodes = whitelistAddress.map(addr => web3.utils.sha3(addr));
        const merkleTree = new MerkleTree(leafNodes, web3.utils.sha3, { sortPairs: true });
        merkleProof = merkleTree.getHexProof(leafNodes[0]);
        rootHash = merkleTree.getRoot().toString('hex');
    });

    it('1. Create IDO', async () => {
        const timestampNow1 = new Date().getTime() / 1000;
        const maxAmount = BigInt(10000 * mulDecimals);
        const individualMinAmount = BigInt(1 * mulDecimals);
        const pricePerToken = individualMinAmount;
        const minimumRaise = BigInt(2 * mulDecimals);
        const ido1 = await instance_idofactory.createIDO([true, pricePerToken, (timestampNow1 + 30).toFixed(0), (timestampNow1 + 60).toFixed(0),
            individualMinAmount, maxAmount, minimumRaise, maxAmount, false], "0x0", instance_busd.address, true, instance_tko.address, 1, accounts[0]);
        const ido2 = await instance_idofactory.createIDO([false, pricePerToken, (timestampNow1 + 30).toFixed(0), (timestampNow1 + 60).toFixed(0),
            individualMinAmount, maxAmount, minimumRaise, maxAmount, false], "0x0", instance_busd.address, false, instance_tko.address, 1, accounts[0]);
        const ido3 = await instance_idofactory.createIDO([false, pricePerToken, (timestampNow1 + 30).toFixed(0), (timestampNow1 + 60).toFixed(0),
            individualMinAmount, maxAmount, minimumRaise, maxAmount, true], "0x0", instance_busd.address, false, instance_tko.address, 1, accounts[0]);
        listaddress = [
            ido1.logs[0].args.ido,
            ido2.logs[0].args.ido,
            ido3.logs[0].args.ido
        ];
        instance_ido1 = await IDO.at(listaddress[0]);
        initialize1 = await instance_ido1.initialize.call();
        await instance_ido1.setMerkleRoot("0x" + rootHash);
        instance_ido2 = await IDO.at(listaddress[1]);
        initialize2 = await instance_ido2.initialize.call();
        instance_ido3 = await IDO.at(listaddress[2]);
        initialize3 = await instance_ido3.initialize.call();
    });

    it('2. Fund', async () => {
        const totalSupplyTKO = await instance_tko.totalSupply();
        // IDO 1
        await instance_tko.increaseAllowance(listaddress[0], totalSupplyTKO);
        await instance_ido1.fund(initialize1.tokensForSale);
        assert.deepEqual(await instance_tko.balanceOf(listaddress[0]), initialize1.tokensForSale);
        // IDO 2
        await instance_tko.increaseAllowance(listaddress[1], totalSupplyTKO);
        await instance_ido2.fund(initialize2.tokensForSale);
        assert.deepEqual(await instance_tko.balanceOf(listaddress[1]), initialize2.tokensForSale);
        // IDO 3
        await instance_tko.increaseAllowance(listaddress[2], totalSupplyTKO);
        await instance_ido3.fund(initialize3.tokensForSale);
        assert.deepEqual(await instance_tko.balanceOf(listaddress[2]), initialize3.tokensForSale);
    });

    it('3. Swap', async () => {
        await instance_busd.transfer(accounts[1], BigInt(100000000 * mulDecimals));
        await instance_busd.transfer(accounts[3], BigInt(100000000 * mulDecimals));
        const totalSupply = await instance_busd.totalSupply();

        const timestampNow1 = Number((new Date().getTime() / 1000).toFixed(0));
        const timeoutTimeStart = Number(initialize1.startDate) - timestampNow1;
        const amount1 = Number(2 * mulDecimals); // Achieved
        const amount2 = Number(1 * mulDecimals); // Not Achieved
        await delay(timeoutTimeStart > 0 ? (timeoutTimeStart * 1000)  : 0);
        // IDO 1
        await instance_busd.increaseAllowance(listaddress[0], totalSupply, { from: accounts[1] });
        await instance_busd.increaseAllowance(listaddress[0], totalSupply, { from: accounts[3] });
        await truffleAssert.fails(instance_ido1.swap(merkleProof, BigInt(amount1), { from: accounts[3] }), "Address not whitelist");
        truffleAssert.eventEmitted(await instance_ido1.swap(merkleProof, BigInt(amount1), { from: accounts[1] }), 'PurchaseEvent');
        assert.deepEqual(Number(await instance_ido1.redeemAmount(accounts[1])), amount1);
        // IDO 2
        const value = web3.utils.toWei("1", "ether");
        truffleAssert.eventEmitted(await instance_ido2.methods['swap(uint256)'](BigInt(amount2), { from: accounts[4], value }), 'PurchaseEvent');
        assert.deepEqual(Number(await instance_ido2.redeemAmount(accounts[4])), amount2);
        assert.deepEqual(Number(await web3.eth.getBalance(listaddress[1])), amount2);
        // IDO 3
        truffleAssert.eventEmitted(await instance_ido3.methods['swap(uint256)'](BigInt(amount2), { from: accounts[5], value }), 'PurchaseEvent');
        assert.deepEqual(Number(await instance_ido3.redeemAmount(accounts[5])), amount2);
        assert.deepEqual(Number(await web3.eth.getBalance(listaddress[2])), amount2);
        assert.deepEqual(Number(await instance_tko.balanceOf(accounts[5])), amount2);
    });

    it('4. Redeem', async () => {
        await truffleAssert.fails(instance_ido1.redeemTokens({ from: accounts[1] }), "Has to be finalized");
        const timestampNow2 = Number((new Date().getTime() / 1000).toFixed(0));
        const timeoutTimeEnd = Number(initialize1.endDate) + 3 - timestampNow2;
        await delay(timeoutTimeEnd > 0 ? (timeoutTimeEnd * 1000) : 0);
        // IDO 1
        await truffleAssert.fails(instance_ido1.redeemGivenMinimumGoalNotAchieved({ from: accounts[1] }), "Minimum raise has to be reached");
        truffleAssert.eventEmitted(await instance_ido1.redeemTokens({ from: accounts[1] }), 'Redeem');
        await truffleAssert.fails(instance_ido1.redeemTokens({ from: accounts[1] }), "Already redeemed");
        assert.deepEqual(Number(await instance_tko.balanceOf(accounts[1])), 2000000000000000000);
        assert.deepEqual(Number(await instance_tko.balanceOf(instance_ido1.address)), Number(9998 * mulDecimals));
        // IDO 2
        await truffleAssert.fails(instance_ido2.redeemTokens({ from: accounts[1] }), "Minimum raise has not been achieved");
        const getBalance = Number(await web3.eth.getBalance(accounts[4])) / (10 ** 18);
        assert.deepEqual((Number(await web3.eth.getBalance(accounts[4])) / (10 ** 18)).toFixed(0), getBalance.toFixed(0));
        assert.deepEqual(Number(await web3.eth.getBalance(listaddress[1])), 1000000000000000000);
        truffleAssert.eventEmitted(await instance_ido2.redeemGivenMinimumGoalNotAchieved({ from: accounts[4] }), 'Refund');
        await truffleAssert.fails(instance_ido2.redeemGivenMinimumGoalNotAchieved({ from: accounts[4] }), "Already redeemed");
        assert.deepEqual((Number(await web3.eth.getBalance(accounts[4])) / (10 ** 18)).toFixed(0), (getBalance + 1).toFixed(0));
        assert.deepEqual(Number(await web3.eth.getBalance(listaddress[1])), 0);
        // IDO 3
        await truffleAssert.fails(instance_ido3.redeemTokens({ from: accounts[5] }), "Has to be non Atomic swap");
        await truffleAssert.fails(instance_ido3.redeemGivenMinimumGoalNotAchieved({ from: accounts[5] }), "Has to be non Atomic swap");
    });

    it('5. Withdraw', async () => {
        // IDO 1
        assert.deepEqual(Number(await instance_busd.balanceOf(listaddress[0])), 2000000000000000000);
        assert.deepEqual(Number(await instance_tko.balanceOf(listaddress[0])) / (10 ** 18), 9998);
        await instance_ido1.withdrawFunds();
        await instance_ido1.withdrawUnsoldTokens();
        assert.deepEqual(Number(await instance_busd.balanceOf(listaddress[0])), 0);
        assert.deepEqual(Number(await instance_tko.balanceOf(listaddress[0])), 0);
        // IDO 2
        assert.deepEqual((Number(await instance_tko.balanceOf(listaddress[1])) / (10 ** 18)).toFixed(0), "10000");
        await truffleAssert.fails(instance_ido2.withdrawFunds(), 'Minimum raise has to be reached');
        await instance_ido2.withdrawUnsoldTokens();
        assert.deepEqual(Number(await instance_tko.balanceOf(listaddress[1])), 0);
        // IDO 3
        assert.deepEqual((Number(await instance_tko.balanceOf(listaddress[2])) / (10 ** 18)).toFixed(0), "9999");
        assert.deepEqual(Number(await web3.eth.getBalance(listaddress[2])), 1000000000000000000);
        await instance_ido3.withdrawFunds();
        await instance_ido3.withdrawUnsoldTokens();
        assert.deepEqual(Number(await instance_tko.balanceOf(listaddress[2])), 0);
        assert.deepEqual(Number(await web3.eth.getBalance(listaddress[2])), 0);
    });

});
