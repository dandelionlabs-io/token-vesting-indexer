const axios = require("axios");
const networks = require("../constants/networks");

const getFirstTransaction = async (network, contractAddress) => {

    if (!networks[network])
        throw "'" + network + "' network information cannot be found. Check configuration files. Contract address: " + contractAddress

    const getContractCreationTxURL =
        networks[network].etherscanUrl + "api?module=account&action=txlist&address=" +
        contractAddress +
        "&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=" +
        networks[network].etherscanApikey;

    return await axios.get(getContractCreationTxURL);
};

module.exports = {
    getFirstTransaction
};
