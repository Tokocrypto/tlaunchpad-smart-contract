
#STEP admin Create IDO

1. Create IDO = Factory: 
https://testnet.bscscan.com/tx/0x3837ae6bf4f248136486f5b970435440408657549dd3a985448901ba203515f5 

2. Claim ownership = IDO:
https://testnet.bscscan.com/tx/0x09ad16b73285fbc42332451f7f7c3c6c409f98cd716e109c152369d88eb1c3e7 

3. Set approval (approve) = TKO:
https://testnet.bscscan.com/tx/0x70ec77c7a8f4e9d989259d141bda0fa2f604a5f3878c595d67b6153005378451 

4. Fund = IDO
https://testnet.bscscan.com/tx/0xa9595dd9a404b2f8c94da88a41a6fb1136988f64d20d8926e9722f4b93860ace 

5. whitelist = IDO = fungsi add
https://testnet.bscscan.com/tx/0xeab38b6a080cc6da1f5aaaf7846f4d4569062d9ee1d9e5e07ea3aa934b83f8ed 

#STEP USER LOCK/UNLOCK

lock(sebelum sale) dulu, aply (tombol apply hanya dibuka ketika belum buka sale) lwt form ->  setelah diwhitelist di db dan boleh KYC. jika KYC lolos, add whitelist di contract. baru bisa stake


1. kasih approve dulu ke TPOWER

1. Lock TKO supaya jadi T Power = pake contract T Power
https://testnet.bscscan.com/tx/0x93bb5411cb610efac8a1a4896ef9bd16025951b40e6d90bed8ed21301da9a082  

2. unlock dari T Power supaya balik ke TKO = pake contract T Power
https://testnet.bscscan.com/tx/0x48a316d9d7de2b456cff7d0567aeb6d7456684cbf257c68b0612491cf4cb340a 

3. sebelum claim, dia harus diunlock dulu
https://testnet.bscscan.com/tx/0xaa85c492a4fe3f039558e62bfe339e2eb3e450ad661768cfcd5ada5d46781c75 


#USER STACKING (syarat: user harus whitelisted. ini akan dipilih dari jumlah stake nya)

1. tombol invest = panggil fungsi swap dari IDO
https://testnet.bscscan.com/tx/0xd94b528105bd43a777af2339a61532f509bc59d60153c15d6c8794f60899b70e  

2. RedeemToken = dari contract IDO. di button dia namanya "claim"
https://testnet.bscscan.com/tx/0xa0939284215953388298a34b2836d1922922c61b3e9f9c0e572369566c36bc11