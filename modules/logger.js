const { Event } = require("../database/models");
const { getCurrentTimeString } = require("../utils/time")
const { timeOut } = require("../utils/timeOut")
const { Pool } = require("../database/models");

const logSync = async (events, web3) => {
  const blockTimestamps = new Map();
  for (let index = 0; index < events.length; index++) {
    const event = events[index];

    if(event.event) {

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
  }
};

/**
 * @description Fetch the event logs from Blockchain, then write them in the database.
 * @param latestBlockNum
 * @param syncedBlockHeight
 * @returns
 */
let log = async function (latestBlockNum, syncedBlockHeight, factory, web3) {
  /// Some blockchains sets the limit to the range of blocks when fetching the logs.
  /// In order to avoid it, we are iterating that range through the loop by limited range blocks.
  /// The limited range block is called offset in our script.

  let from, to;
  const offset = process.env.LISTENER_OFFSET;
  const iterationCount = Math.max(0, (latestBlockNum - syncedBlockHeight) / offset);

  from = syncedBlockHeight;
  if (latestBlockNum - syncedBlockHeight > offset) {
    to = offset + syncedBlockHeight;
  } else {
    to = latestBlockNum;
  }

  for (let i = 0; i < iterationCount; i++) {
    for (const poolsList of factory.values()) {
      for (const pool of poolsList) {
        await processEvents(pool, from, to, web3);
        await timeOut(1);
      }
    }

    from += offset;
    to = from + offset > latestBlockNum ? latestBlockNum : from + offset;

    const factoryAddresses = Array.from(factory.keys());
    await Pool.update({ syncedBlockHeight: to }, { where: { 'FactoryAddress': factoryAddresses } });
  }
};

let processEvents = async function (pool, from, to, web3) {
  let poolEvents;
  try {
    poolEvents = (
        await pool.getPastEvents("allEvents", {fromBlock: from + 1, toBlock: to})
    ).sort((a, b) =>
        a.blockNumber > b.blockNumber ? 1 : b.blockNumber > a.blockNumber ? -1 : 0
    );
  } catch (error) {
    console.log(`${getCurrentTimeString()}: event error:`);
    console.log('yo terrible error', error.toString());
    await timeOut(process.env.LISTENER_SLEEP_INTERVAL);
    process.exit(0);
    // Maybe to reinit the Web3?
  }

  /// Exit from the script, to restart it by docker, if failed to log the events into the blockchain
  if (poolEvents.length > 0) {
    try {
      await logSync(poolEvents, web3);
    } catch (error) {
      console.error(`${getCurrentTimeString()}: log error to database...`);
      console.error(error);
      process.exit();
    }
  }
};

module.exports = { log };
