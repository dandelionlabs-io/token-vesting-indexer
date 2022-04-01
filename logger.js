/// Importing third party modules
const fs          = require('fs');                // to fetch the abi of smartcontract

let loadData = async function(file) {
  try {
    return JSON.parse(fs.readFileSync(`./public/${file}.json`, 'utf-8'));
  } catch (error) {
    throw new Error(`Can not read ${file}.json`);
  }
}

let saveData = async function(file, data) {
  try {
    fs.writeFileSync(`./public/${file}.json`, JSON.stringify(data));
  } catch (error) {
    console.error(error);
    process.exit()
  }
}

/**
    /// @notice Event emitted when a new grant is created
    event GrantAdded(address indexed recipient, uint256 indexed amount);

    /// @notice Event emitted when tokens are claimed by a recipient from a grant
    event GrantTokensClaimed(address indexed recipient, uint256 indexed amountClaimed);

    /// @notice Event emitted when the grant investor is changed
    event ChangeInvestor(address indexed oldOwner, address indexed newOwner);

 * @param {*} data 
 * @param {*} arr 
 * @param {*} web3 
 */
const logSync = async (dataName, arr, web3, duration) => {
  let data = await loadData(dataName);

  for (let index = 0; index < arr.length; index++) {
    const event = arr[index];

    if (event['event'] == 'GrantAdded') {
      let amount    = web3.utils.fromWei(event.returnValues.amount, 'ether');
      let perSecond = parseFloat(amount) / parseInt(duration);
      let claimed   = 0;
      let recipient = event.returnValues.recipient.toLowerCase();

      data[recipient] = {
        amount:     amount,
        perSecond:  perSecond,
        claimed:    claimed
      };
    }
    else if (event['event'] == 'GrantTokensClaimed') {
      let recipient = event.returnValues.recipient.toLowerCase();
      let amount    = web3.utils.fromWei(event.returnValues.amountClaimed.toString(), 'ether');

      if (data[recipient]) {
        data[recipient].claimed = parseFloat(data[recipient].claimed) + parseFloat(amount);
      }
    } else if (event['event'] == 'ChangeInvestor') {
      let o = event.returnValues.oldOwner.toLowerCase();
      let n = event.returnValues.newOwner.toLowerCase();

      if (data[o] && !data[n]) {
        data[n] = JSON.parse(JSON.stringify(data[o]));
        delete data[o];
      }
    }
  }

  await saveData(dataName, data);
}


module.exports = {
  logSync
}