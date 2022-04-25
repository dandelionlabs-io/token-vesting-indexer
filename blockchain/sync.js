/**
 * @description Sync the smartcontract with the SQL. The sync.js is the starting point of it.
 *
 * @author Medet Ahmetson <admin@blocklords.io>
 * @contributor Alexander Filatov <alex@dandelionlabs.io>
 * @contributor Leon Acosta <leon@dandelionlabs.io>
 *
 * Following environment variables are required for any *-sync script:
 * @requires REMOTE_HTTP              - the URL endpoint of the blockchain node. i.e. For ethereum use the https://infura.io
 *
 * Following additional json files are required:
 * @requires vesting.json     - the ABI of the smartcontract
 */
require("dotenv").config();

const fs = require("fs"); // to fetch the abi of smartcontract
const axios = require("axios");
const blockchain = require("./blockchain");
const { factories, networks } = require("../constants");
const { Factory, Pool, Settings } = require("../database/models");
const { logSync } = require("./logger");

// Initiation of web3 and contract
const web3list = new Map();

const factory_abi = JSON.parse(fs.readFileSync("abis/factory.json", "utf-8"));

const factoryContracts = []

// create web3 instance depending on the network
for (let factoryIndex = 0; factoryIndex < factories.length; factoryIndex++) {
  if (!web3list.get(factories[factoryIndex]).network]) {
    const networkInformation = networks[factories[factoryIndex].network];
    web3list.set(blockchain.reInit(networkInformation.rpcUrl))
  }

  factoryContracts.push(blockchain.loadContract(
    web3list[factories[factoryIndex].network],
    factories[factoryIndex].address,
    factory_abi
  ));
}

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

  await initPools();

  while (true === true) {
    // get smaller block number to update from pools
    let syncedBlockHeight = await Pool.findOne({
      attributes: [[sequelize.fn('min', sequelize.col('syncedBlockHeight')), 'syncedBlockHeight']]
    });

    // if there's no block number, then we break
    if (!syncedBlockHeight) break;

    if (!syncedBlockHeight) {
      const dataftx = await getFirstTransaction(process.env.FACTORY_CONTRACT_ADDRESS)
      syncedBlockHeight = await Settings.create({ key: 'syncedBlockHeight', value: dataftx?.data.result[0].blockNumber });
    }

    const latestBlockNum = await web3.eth.getBlockNumber()

    if (isNaN(parseInt(latestBlockNum))) {
      console.log("Failed to connect to web3.");
      web3 = blockchain.reInit();
      await timeOut(process.env.LISTENER_SLEEP_INTERVAL);
      continue;
    }

    /// "from" can't be greater than "to"
    if (syncedBlockHeight.value > latestBlockNum) {
      console.log(`${currentTime()}: ${syncedBlockHeight.value} > ${latestBlockNum}`);

      // Set to the latest block number from the blockchain.
      await Settings.update({ value: latestBlockNum }, { where: { key: 'syncedBlockHeight' }}
      )
    }

    if (syncedBlockHeight.value < latestBlockNum) {
      console.log(`${currentTime()}: ${syncedBlockHeight.value} < ${latestBlockNum}`);
      await log(latestBlockNum, syncedBlockHeight.value);
    }

    console.log(`${currentTime()}: ${latestBlockNum} is synced`);

    /// if "from" and "to" are matching, database synced up to latest block.
    /// Wait for appearance of a new block
    await timeOut(process.env.LISTENER_SLEEP_INTERVAL);
  }
};

/**
 * @description Fetch the event logs from Blockchain, then write them in the database.
 * @param latestBlockNum
 * @param syncedBlockHeight
 * @returns
 */
let log = async function (latestBlockNum, syncedBlockHeight) {
  /// Some blockchains sets the limit to the range of blocks when fetching the logs.
  /// In order to avoid it, we are iterating that range through the loop by limited range blocks.
  /// The limited range block is called offset in our script.

  let from, to;
  const offset = process.env.LISTENER_OFFSET;
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
      await processEvents(pool[1], pool[0], from, to);
      poolCount++;
      if (pools.size !== poolCount) await timeOut(1);
    }

    from += offset;
    to = from + offset > latestBlockNum ? latestBlockNum : from + offset;

    await Settings.update({ value: to }, {where: { key: 'syncedBlockHeight' }})
  }
};

let processEvents = async function (pool, dataName, from, to) {
  let poolEvents;
  try {
    poolEvents = (
      await pool[2].getPastEvents("allEvents", {fromBlock: from + 1, toBlock: to,})
    ).sort((a, b) =>
      a.blockNumber > b.blockNumber ? 1 : b.blockNumber > a.blockNumber ? -1 : 0
    );
  } catch (error) {
    console.log(`${currentTime()}: event error:`);
    console.log(error.toString());
    await timeOut(process.env.LISTENER_SLEEP_INTERVAL);
    process.exit(0);
    // Maybe to reinit the Web3?
  }

  /// Exit from the script, to restart it by docker, if failed to log the events into the blockchain
  if (poolEvents.length > 0) {
    try {
      await logSync(dataName, poolEvents, web3);
    } catch (error) {
      console.error(`${currentTime()}: log error to database...`);
      console.error(error);
      process.exit();
    }
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

/**
 * @description Loads pools and create factories and pools in the database.
 */
const initPools = async () => {
  for (let factoryIndex = 0; factoryIndex < factoryContracts.length; i++) {

    const factory = await Factory.findByPk(factoryContracts[i].address);

    if (!factory) {
      const dataftx = await getFirstTransaction(factoryContracts[factoryIndex].network, process.env.FACTORY_CONTRACT_ADDRESS)
      factory = await Factory.create({
        address: factoryContracts[factoryIndex].address,
        projectName: factoryContracts[factoryIndex].projectName,
        logoUrl: factoryContracts[factoryIndex].logoUrl(),
        website: factoryContracts[factoryIndex].website,
        initialBlockHeight: dataftx?.data.result[0].blockNumber,
        network: factoryContracts[factoryIndex].network,
      });
    }

    const addresses = await factoryContracts[factoryIndex].methods.getPools().call();
    const contracts = addresses.map((x) => blockchain.loadContract(web3, x, ABI));

    const values = await Promise.all(
      contracts.map((x) => x.methods.pool().call())
    );

    for (let i = 0; i < values.length; i++) {
      const poolData = values[i];
      pools.set(poolData.name, [addresses[i], poolData.vestingDuration]);

      const pool = await Pool.findByPk(addresses[i]);

      if (!pool)
        await Pool.create({
          name: poolData.name,
          address: addresses[i],
          start: poolData.startTime,
          end: poolData.endTime,
          factoryAddress: process.env.FACTORY_CONTRACT_ADDRESS,
          factory.syncedBlockHeight: factory.initialBlockHeight
        });
    };

    pools.forEach((value, key) => {
      value.push(blockchain.loadContract(web3list.get(factory.network), value[0], ABI));
    });
  }
};

const getFirstTransaction = async (network, contractAddress) => {

  if (networks[network])
    throw "'" + network + "' network information cannot be found. Check configuration files. Contract address: " + contractAddress

  const getContractCreationTxURL =
      networks[network].etherscanUrl + "api?module=account&action=txlist&address=" +
      contractAddress +
      "&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=" +
      networks[network].etherscanApikey;

  return await axios.get(getContractCreationTxURL);
};

module.exports = { SyncByUpdate, web3 };
