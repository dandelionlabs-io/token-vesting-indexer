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

  return new Web3(process.env.RPC_URL, options);
}

const loadContract = function(web3, address, abi) {
  const contract = new web3.eth.Contract(abi, address);
  return contract;
};

module.exports = {
  loadContract,
  reInit
}
