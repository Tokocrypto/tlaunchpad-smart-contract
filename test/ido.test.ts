import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { MerkleTree } from "merkletreejs";

describe("IDO Factory & IDO", function () {
    let provider: any;
    let accounts: any;
    let IDO: any;
    let instance_tko: any;
    let instance_busd: any;
    let instance_idofactory: any;
    let instance_ido1: any; // Raise Achieved, Has BUSD is True, Whitelisted, & Not Atomic Swap
    let instance_ido2: any; // Raise Not Achieved, Not Has BUSD, Not Whitelisted, & Not Atomic Swap
    let instance_ido3: any; // Raise Not Achieved, Not Has BUSD, Not Whitelisted, & Atomic Swap is True
    let listaddress: any;
    var initialize1: any;
    var initialize2: any;
    var initialize3: any;
    var mulDecimals: number;
    var merkleProof: Array<string>;
    var rootHash: string;
    var delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    before(async function () {
        provider = waffle.provider;
        accounts = await ethers.getSigners();
        IDO = await ethers.getContractFactory("IDO");
        instance_tko = await (await ethers.getContractFactory("TKOToken")).deploy();
        await instance_tko.deployed();
        instance_busd = await (await ethers.getContractFactory("BUSD")).deploy();
        await instance_busd.deployed();
        instance_idofactory = await (await ethers.getContractFactory("IDOFactory")).deploy(accounts[0].address);
        await instance_idofactory.deployed();
        instance_idofactory.grantRole(await instance_idofactory.OPS_ROLE(), accounts[0].address);

        mulDecimals = 10 ** 18;
        await instance_tko['mint(address,uint256)'](accounts[0].address, BigInt(100000000 * mulDecimals));
        let whitelistAddress = [accounts[1].address, accounts[2].address];
        const leafNodes = whitelistAddress.map(addr => ethers.utils.keccak256(addr));
        const merkleTree = new MerkleTree(leafNodes, ethers.utils.keccak256, { sortPairs: true });
        merkleProof = merkleTree.getHexProof(leafNodes[0]);
        rootHash = merkleTree.getRoot().toString('hex');
    });

    it('1. Create IDO', async () => {
        const timestampNow = new Date().getTime() / 1000;
        const maxAmount = BigInt(10000 * mulDecimals);
        const individualMinAmount = BigInt(mulDecimals);
        const pricePerToken = individualMinAmount;
        const minimumRaise = BigInt(2 * mulDecimals);
        const ido1 = await instance_idofactory.createIDO([true, pricePerToken, (timestampNow + 30).toFixed(0), (timestampNow + 60).toFixed(0), individualMinAmount,
            maxAmount, minimumRaise, maxAmount, false], "0x0", instance_busd.address, true, instance_tko.address, 1, accounts[0].address);
        const ido2 = await instance_idofactory.createIDO([false, pricePerToken, (timestampNow + 30).toFixed(0), (timestampNow + 60).toFixed(0), individualMinAmount,
            maxAmount, minimumRaise, maxAmount, false], "0x0", instance_busd.address, false, instance_tko.address, 1, accounts[0].address);
        const ido3 = await instance_idofactory.createIDO([false, pricePerToken, (timestampNow + 30).toFixed(0), (timestampNow + 60).toFixed(0), individualMinAmount,
            maxAmount, minimumRaise, maxAmount, true], "0x0", instance_busd.address, false, instance_tko.address, 1, accounts[0].address);
        listaddress = [
            (await ido1.wait()).logs[1].address,
            (await ido2.wait()).logs[1].address,
            (await ido3.wait()).logs[1].address
        ];
        instance_ido1 = await IDO.attach(listaddress[0]);
        initialize1 = await instance_ido1.initialize.call();
        await instance_ido1.setMerkleRoot("0x" + rootHash);
        instance_ido2 = await IDO.attach(listaddress[1]);
        initialize2 = await instance_ido2.initialize.call();
        instance_ido3 = await IDO.attach(listaddress[2]);
        initialize3 = await instance_ido3.initialize.call();
    });

    it('2. Fund', async () => {
        const totalSupplyTKO = await instance_tko.totalSupply();
        // IDO 1
        await instance_tko.increaseAllowance(listaddress[0], totalSupplyTKO);
        await instance_ido1.fund(initialize1.tokensForSale);
        expect(await instance_tko.balanceOf(listaddress[0])).to.equal(initialize1.tokensForSale);
        // IDO 2
        await instance_tko.increaseAllowance(listaddress[1], totalSupplyTKO);
        await instance_ido2.fund(initialize2.tokensForSale);
        expect(await instance_tko.balanceOf(listaddress[1])).to.equal(initialize2.tokensForSale);
        // IDO 3
        await instance_tko.increaseAllowance(listaddress[2], totalSupplyTKO);
        await instance_ido3.fund(initialize3.tokensForSale);
        expect(await instance_tko.balanceOf(listaddress[2])).to.equal(initialize3.tokensForSale);
    });

    it('3. Swap', async () => {
        await instance_busd.transfer(accounts[1].address, BigInt(100000000 * mulDecimals));
        await instance_busd.transfer(accounts[3].address, BigInt(100000000 * mulDecimals));
        const totalSupply = await instance_busd.totalSupply();

        const timestampNow = Number((new Date().getTime() / 1000).toFixed(0));
        const timeoutTimeStart = Number(initialize1.startDate) - timestampNow;
        const amount1 = BigInt(2 * mulDecimals); // Achieved
        const amount2 = BigInt(mulDecimals); // Not Achieved
        await delay(timeoutTimeStart > 0 ? (timeoutTimeStart * 1000) : 0);
        // IDO 1
        await instance_busd.connect(accounts[1]).increaseAllowance(listaddress[0], totalSupply);
        await instance_busd.connect(accounts[3]).increaseAllowance(listaddress[0], totalSupply);
        await expect(instance_ido1.connect(accounts[3])['swap(bytes32[],uint256)'](merkleProof, amount1)).to.be.revertedWith("Address not whitelist");
        await expect(instance_ido1.connect(accounts[1])['swap(bytes32[],uint256)'](merkleProof, amount1))
        .to.emit(instance_ido1, 'PurchaseEvent');
        expect(await instance_ido1.redeemAmount(accounts[1].address)).to.equal(amount1);
        // IDO 2
        await expect(instance_ido2.connect(accounts[4])['swap(uint256)'](amount2, { value: amount2 }))
        .to.emit(instance_ido2, 'PurchaseEvent');
        expect(await instance_ido2.redeemAmount(accounts[4].address)).to.equal(amount2);
        expect(await provider.getBalance(listaddress[1])).to.equal(amount2);
        // IDO 3
        await expect(instance_ido3.connect(accounts[5])['swap(uint256)'](amount2, { value: amount2 }))
        .to.emit(instance_ido3, 'PurchaseEvent');
        expect(await instance_ido3.redeemAmount(accounts[5].address)).to.equal(amount2);
        expect(await provider.getBalance(listaddress[2])).to.equal(amount2);
        expect(await instance_tko.balanceOf(accounts[5].address)).to.equal(amount2);
    });

    it('4. Redeem', async () => {
        await expect(instance_ido1.connect(accounts[1]).redeemTokens()).to.be.revertedWith("Has to be finalized");
        const timestampNow = Number((new Date().getTime() / 1000).toFixed(0));
        const timeoutTimeEnd = Number(initialize1.endDate) + 3 - timestampNow;
        await delay(timeoutTimeEnd > 0 ? (timeoutTimeEnd * 1000) : 0);
        // IDO 1
        await expect(instance_ido1.connect(accounts[1]).redeemGivenMinimumGoalNotAchieved()).to.be.revertedWith("Minimum raise has to be reached");
        await expect(instance_ido1.connect(accounts[1]).redeemTokens())
        .to.emit(instance_ido1, 'Redeem');
        await expect(instance_ido1.connect(accounts[1]).redeemTokens()).to.be.revertedWith("Already redeemed");
        expect(await instance_tko.balanceOf(accounts[1].address)).to.equal(BigInt(2 * mulDecimals));
        expect((Number(await instance_tko.balanceOf(instance_ido1.address)) / mulDecimals).toFixed(0)).to.equal("9998");
        // IDO 2
        await expect(instance_ido2.connect(accounts[1]).redeemTokens()).to.be.revertedWith("Minimum raise has not been achieved");
        const getBalance = await provider.getBalance(accounts[4].address);
        expect(await provider.getBalance(accounts[4].address)).to.equal(getBalance);
        expect(await provider.getBalance(listaddress[1])).to.equal(BigInt(mulDecimals));
        await expect(instance_ido2.connect(accounts[4]).redeemGivenMinimumGoalNotAchieved())
        .to.emit(instance_ido2, 'Refund');
        await expect(instance_ido2.connect(accounts[4]).redeemGivenMinimumGoalNotAchieved()).to.be.revertedWith("Already redeemed");
        expect((Number(await provider.getBalance(accounts[4].address)) / mulDecimals).toFixed(0)).to.equal((Number(getBalance) / mulDecimals + 1).toFixed(0));
        expect(Number(await provider.getBalance(listaddress[1]))).to.equal(0);
        // IDO 3
        await expect(instance_ido3.connect(accounts[5]).redeemTokens()).to.be.revertedWith("Has to be non Atomic swap");
        await expect(instance_ido3.connect(accounts[5]).redeemGivenMinimumGoalNotAchieved()).to.be.revertedWith("Has to be non Atomic swap");
    });

    it('5. Withdraw', async () => {
        // IDO 1
        expect(await instance_busd.balanceOf(listaddress[0])).to.equal(BigInt(2 * mulDecimals));
        expect((Number(await instance_tko.balanceOf(listaddress[0])) / mulDecimals).toFixed(0)).to.equal("9998");
        await instance_ido1.withdrawFunds();
        await instance_ido1.withdrawUnsoldTokens();
        expect(Number(await instance_busd.balanceOf(listaddress[0]))).to.equal(0);
        expect(Number(await instance_tko.balanceOf(listaddress[0]))).to.equal(0);
        // IDO 2
        expect(await instance_tko.balanceOf(listaddress[1])).to.equal(BigInt(10000 * mulDecimals));
        await expect(instance_ido2.withdrawFunds()).to.be.revertedWith("Minimum raise has to be reached");
        await instance_ido2.withdrawUnsoldTokens();
        expect(await instance_tko.balanceOf(listaddress[1])).to.equal(0);
        // IDO 3
        expect((Number(await instance_tko.balanceOf(listaddress[2])) / mulDecimals).toFixed(0)).to.equal("9999");
        expect(await provider.getBalance(listaddress[2])).to.equal(BigInt(mulDecimals));
        await instance_ido3.withdrawFunds();
        await instance_ido3.withdrawUnsoldTokens();
        expect(Number(await instance_tko.balanceOf(listaddress[2]))).to.equal(0);
        expect(Number(await provider.getBalance(listaddress[2]))).to.equal(0);
    });
});
