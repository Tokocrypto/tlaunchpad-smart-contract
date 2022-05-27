const fs = require('fs');
const HDWalletProvider = require("@truffle/hdwallet-provider");

// TODO: use env instead of secret.json
let secret = {};
try {
  const path = './secret.json';
  if (fs.existsSync(path)) {
    secret = require(path)
  }
} catch (err) {
  console.error(err)
}
const mnemonic = secret?.local?.mnemonic;

module.exports = {
  plugins: [
    'truffle-plugin-verify',
    'truffle-contract-size',
    'solidity-coverage',
  ],
  api_keys: {
    bscscan: secret.api_key
  },

   networks: {
    local: {
        host: 'localhost',
        port: 8545,
        network_id: '*'
      },
      testnet: {
        provider: () => new HDWalletProvider(mnemonic, `https://data-seed-prebsc-1-s1.binance.org:8545/`),
        network_id: 97,
        confirmations: 10,
        timeoutBlocks: 200,
        skipDryRun: true
      },
      bsc: {
        provider: () => new HDWalletProvider(mnemonic, `https://bsc-dataseed1.binance.org`),
        network_id: 56,
        confirmations: 10,
        timeoutBlocks: 200,
        gas: 4000000,
        skipDryRun: true
      },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.13",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
       optimizer: {
         enabled: true,
         runs: 200
       },
      //  evmVersion: "byzantium"
      }
    }
  },

  // Truffle DB is currently disabled by default; to enable it, change enabled: false to enabled: true
  //
  // Note: if you migrated your contracts prior to enabling this field in your Truffle project and want
  // those previously migrated contracts available in the .db directory, you will need to run the following:
  // $ truffle migrate --reset --compile-all

  db: {
    enabled: false
  }
};
