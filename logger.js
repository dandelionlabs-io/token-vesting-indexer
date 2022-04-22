const fs = require("fs");
const { Event } = require("./models");

let loadData = async function (file) {
  try {
    return JSON.parse(fs.readFileSync(`./data/${file}.json`, "utf-8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        fs.writeFileSync(`./data/${file}.json`, JSON.stringify({}));
        return {};
      } catch (error) {
        console.error(error);
        process.exit();
      }
    }
    throw new Error(`Can not read ${file}.json`);
  }
};

let saveData = async function (file, data) {
  try {
    fs.writeFileSync(`./data/${file}.json`, JSON.stringify(data));
  } catch (error) {
    console.error(error);
    process.exit();
  }
};

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
  const blockTimestamps = new Map();
  let data = await loadData(dataName);
  for (let index = 0; index < arr.length; index++) {
    const event = arr[index];

    const existingEvent = await Event.findOne({where: {blockNumber: event.blockNumber, logIndex: event.logIndex}});

    if (!existingEvent) {

      if (!blockTimestamps.get(event.blockNumber))
        blockTimestamps.set(event.blockNumber, (await web3.eth.getBlock(event.blockNumber)).timestamp)

      const newEvent = {
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
        returnValues: event.returnValues,
        name: event.event,
        PoolAddress: event.address,
        timestamp: blockTimestamps.get(event.blockNumber)
      }
      await Event.create(newEvent);
    }
  }
  await saveData(dataName, data);
};

module.exports = {
  logSync,
};


//   if (event["event"] == "GrantAdded") {
//     let amount = web3.utils.fromWei(event.returnValues.amount, "ether");
//     let perSecond = parseFloat(amount) / parseInt(duration);
//     let claimed = 0;
//     let recipient = event.returnValues.recipient.toLowerCase();
//     let claimHistory = [];
//
//     data[recipient] = {
//       amount: amount,
//       perSecond: perSecond,
//       claimed: claimed,
//       claimHistory: claimHistory,
//     };
//   } else if (event["event"] == "GrantTokensClaimed") {
//     let recipient = event.returnValues.recipient.toLowerCase();
//     let amount = web3.utils.fromWei(
//         event.returnValues.amountClaimed.toString(),
//         "ether"
//     );
//
//     if (data[recipient]) {
//       data[recipient].claimed =
//           parseFloat(data[recipient].claimed) + parseFloat(amount);
//       const timestamp = (await web3.eth.getBlock(event.blockNumber))
//           .timestamp;
//       data[recipient].claimHistory.push({
//         date: timestamp,
//         amount: amount,
//       });
//     }
//   } else if (event["event"] == "ChangeInvestor") {
//     let o = event.returnValues.oldOwner.toLowerCase();
//     let n = event.returnValues.newOwner.toLowerCase();
//
//     if (data[o] && !data[n]) {
//       data[n] = JSON.parse(JSON.stringify(data[o]));
//       delete data[o];
//     }
//   }
// }
