/**
 * @description Sync the smartcontract with the SQL. The sync.js is the starting point of it.
 *
 * @author Medet Ahmetson <admin@blocklords.io>
 *
 * Following environment variables are required for any *-sync script:
 * @requires REMOTE_HTTP              - the URL endpoint of the blockchain node. i.e. For ethereum use the https://infura.io
 *
 * Following additional json files are required:
 * @requires vesting.json     - the ABI of the smartcontract
 */
require("dotenv").config();

const fs = require("fs"); // to fetch the abi of smartcontract
const blockchain = require("./blockchain");
const { Pool } = require("../database/models");
const { logSync } = require("./logger");

// Initiation of web3 and contract
let web3 = blockchain.reInit();

const factory_abi = JSON.parse(fs.readFileSync("abis/factory.json", "utf-8"));
const factory = blockchain.loadContract(
  web3,
  process.env.FACTORY_CONTRACT_ADDRESS,
  factory_abi
);

/// Create the smartcontract instace using the ABI json and the Smartcontract address
const pools = new Map();

const ABI = JSON.parse(fs.readFileSync("abis/vesting.json", "utf-8"));

/**
 * @description This function reads the conf to get the latest updated block height.
 * And then syncs the database until the block height.
 *
 * We are restarting this script in three cases:
 * - Failed to get the events from blockchain. (Most likely blockchain RPC is dead)
 * - Loading up the Configuration. (Most likely code bug)
 * - Updating the data on File system and Database. (Most likely resources are busy)
 */
const SyncByUpdate = async () => {

  await getPools();

  /// Getting configuration
  let conf = await loadConf();

  while (true === true) {
    let { latestBlockNum, syncedBlockHeight } = await blockHeights(conf);
    if (isNaN(parseInt(latestBlockNum))) {
      console.log("Failed to connect to web3.");
      web3 = blockchain.reInit();
      await timeOut(conf["sleepInterval"]);
      continue;
    }

    /// "from" can't be greater than "to"
    if (syncedBlockHeight > latestBlockNum) {
      console.log(`${currentTime()}: ${syncedBlockHeight} > ${latestBlockNum}`);

      // Set to the latest block number from the blockchain.
      conf["syncedBlockHeight"] = latestBlockNum;
      await saveConf(conf);
    }

    if (syncedBlockHeight < latestBlockNum) {
      console.log(`${currentTime()}: ${syncedBlockHeight} < ${latestBlockNum}`);
      await log(conf, latestBlockNum, syncedBlockHeight);
    }

    console.log(`${currentTime()}: ${latestBlockNum} is synced`);

    /// if "from" and "to" are matching, database synced up to latest block.
    /// Wait for appearance of a new block
    await timeOut(conf["sleepInterval"]);
  }
};

/**
 * @description Return the latest local updated block height and blockchain latest block.
 *
 * We use a separated function, to catch the errors. And throw error in standard way as Sync.js accepts.
 */
let blockHeights = async function (conf) {
  let latestBlockNum;
  let syncedBlockHeight;

  /// "from" block height
  syncedBlockHeight = conf["syncedBlockHeight"];
  if (isNaN(syncedBlockHeight)) {
    throw new Error("syncedBlockHeight must be integer");
  }

  /// "to" block height
  try {
    latestBlockNum = await web3.eth.getBlockNumber();
  } catch (error) {
    return { undefined, syncedBlockHeight };
  }

  return { latestBlockNum, syncedBlockHeight };
};

/**
 * @description Fetch the event logs from Blockchain, then write them in the database.
 * @param conf JSON configuration
 * @param latestBlockNum
 * @param syncedBlockHeight
 * @returns
 */
let log = async function (conf, latestBlockNum, syncedBlockHeight) {
  /// Some blockchains sets the limit to the range of blocks when fetching the logs.
  /// In order to avoid it, we are iterating that range through the loop by limited range blocks.
  /// The limited range block is called offset in our script.

  let from, to;
  const offset = conf["offset"];
  const iterationCount = Math.max(
    0,
    (latestBlockNum - syncedBlockHeight) / offset
  );

  from = syncedBlockHeight;
  if (latestBlockNum - syncedBlockHeight > offset) {
    to = offset + syncedBlockHeight;
  } else {
    to = latestBlockNum;
  }

  for (let i = 0; i < iterationCount; i++) {
    let poolCount = 0;

    for (const pool of pools) {
      await processEvents(pool[1], pool[0], conf, from, to);
      poolCount++;
      if (pools.size !== poolCount) await timeOut(1);
    }

    from += offset;
    to = from + offset > latestBlockNum ? latestBlockNum : from + offset;

    conf["syncedBlockHeight"] = to;
    await saveConf(conf);
  }
};

let processEvents = async function (pool, dataName, conf, from, to) {
  let poolEvents;
  try {
    poolEvents = (
      await pool[2].getPastEvents("allEvents", {
        fromBlock: from + 1,
        toBlock: to,
      })
    ).sort((a, b) =>
      a.blockNumber > b.blockNumber ? 1 : b.blockNumber > a.blockNumber ? -1 : 0
    );
  } catch (error) {
    console.log(`${currentTime()}: event error:`);
    console.log(error.toString());
    await timeOut(conf["sleepInterval"]);
    process.exit(0);
    // Maybe to reinit the Web3?
  }

  /// Exit from the script, to restart it by docker, if failed to log the events into the blockchain
  if (poolEvents.length > 0) {
    try {
      await logSync(
        dataName,
        poolEvents,
        web3,
        process.env.PRIVATE_SALE_DURATION
      );
    } catch (error) {
      console.error(`${currentTime()}: log error to database...`);
      console.error(error);
      process.exit();
    }
  }
};

let loadConf = async function () {
  try {
    return JSON.parse(fs.readFileSync("./config/sync-status.json", "utf-8"));
  } catch (error) {
    throw new Error(`Can not read config/sync-status.json`);
  }
};

let saveConf = async function (conf) {
  try {
    fs.writeFileSync("./config/sync-status.json", JSON.stringify(conf));
  } catch (error) {
    console.error(error);
    process.exit();
  }
};

/**
 * @description Sleeps the code for few seconds
 * @param {Integer} seconds interval to wait before waiting
 * @returns
 */
const timeOut = async function (seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const currentTime = function () {
  let currentdate = new Date();
  return `${currentdate.getDate()}/${
    currentdate.getMonth() + 1
  }/${currentdate.getFullYear()} ${currentdate.getHours()}:${currentdate.getMinutes()}:${currentdate.getSeconds()}`;
};

const getPools = async () => {
  const addresses = await factory.methods.getPools().call();

  const contracts = addresses.map((x) => blockchain.loadContract(web3, x, ABI));

  const values = await Promise.all(
    contracts.map((x) => x.methods.pool().call())
  );

  const poolsConfigList = [];

  for (let i = 0; i < values.length; i++) {
    const poolData = values[i];
    pools.set(poolData.name, [addresses[i], poolData.vestingDuration]);

    const poolConfig = {};
    poolConfig.name = poolData.name;
    poolConfig.address = addresses[i];
    poolConfig.start = poolData.startTime;
    poolConfig.end = poolData.endTime;
    poolConfig.factoryAddress = process.env.FACTORY_CONTRACT_ADDRESS;
    poolsConfigList.push(poolConfig);

    const pool = await Pool.findByPk(addresses[i]);

    if (!pool)
      await Pool.create(poolConfig);
  };

  pools.forEach((value, key) => {
    value.push(blockchain.loadContract(web3, value[0], ABI));
  });
};

module.exports = { SyncByUpdate, web3 };
