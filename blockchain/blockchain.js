let Web3 = require('web3');

const reInit = function(rpcUrl) {
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

  return new Web3(rpcUrl, options);
}

const contractList = new Map();

const loadContract = function(web3, address, abi) {
    if (!contractList.get(address))
        contractList.set(address, new web3.eth.Contract(abi, address));
  return contractList.get(address);
};

module.exports = {
  loadContract,
  reInit
}
