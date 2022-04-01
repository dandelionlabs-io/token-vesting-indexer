let Web3 = require('web3');

const reInit = function() {
  var options = {
    timeout: 60000, // ms
  
    // Enable auto reconnection
    reconnect: {
        auto: true,
        delay: 5000, // ms
        maxAttempts: 20,
        onTimeout: false
    }
  };
  
  return new Web3(process.env.REMOTE_HTTP, options);
}

const addAccount = function (web3, privateKey) {
  if (privateKey == undefined) {
    throw "No private key found. Can not connect to blockchain.";
  }

  let owner = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(owner);
  return owner;
};

const loadContract = function(web3, address, abi) {
  const contract = new web3.eth.Contract(abi, address);
  return contract;
};

module.exports = {
  addAccount,
  loadContract,
  reInit
}