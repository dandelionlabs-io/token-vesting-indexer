const fs = require("fs");

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
  let data = await loadData(dataName);

  for (let index = 0; index < arr.length; index++) {
    const event = arr[index];

    if (event["event"] == "GrantAdded") {
      let amount = web3.utils.fromWei(event.returnValues.amount, "ether");
      let perSecond = parseFloat(amount) / parseInt(duration);
      let claimed = 0;
      let recipient = event.returnValues.recipient.toLowerCase();
      let claimHistory = [];

      data[recipient] = {
        amount: amount,
        perSecond: perSecond,
        claimed: claimed,
        claimHistory: claimHistory,
      };
    } else if (event["event"] == "GrantTokensClaimed") {
      console.log(event);
      let recipient = event.returnValues.recipient.toLowerCase();
      let amount = web3.utils.fromWei(
        event.returnValues.amountClaimed.toString(),
        "ether"
      );
      if (data[recipient]) {
        data[recipient].claimed =
          parseFloat(data[recipient].claimed) + parseFloat(amount);
        data[recipient].claimHistory.push({
          date: event.blockNumber,
          amount: amount,
        });
      }
    } else if (event["event"] == "ChangeInvestor") {
      let o = event.returnValues.oldOwner.toLowerCase();
      let n = event.returnValues.newOwner.toLowerCase();

      if (data[o] && !data[n]) {
        data[n] = JSON.parse(JSON.stringify(data[o]));
        delete data[o];
      }
    } else if (event["event"] == "OwnershipTransferred") {
      const path = "./config/poolsConfig.json";
      const config = JSON.parse(fs.readFileSync(path, "utf-8"));

      config.find((x) => x.address == event.address)["owner"] =
        event.returnValues.newOwner;

      fs.writeFileSync(path, JSON.stringify(config), "utf-8");
    }
  }

  await saveData(dataName, data);
};

module.exports = {
  logSync,
};
