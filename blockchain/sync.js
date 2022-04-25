/**
 * @description Sync the smartcontract with the SQL. The sync.js is the starting point of it.
 *
 * @author Medet Ahmetson <admin@blocklords.io>
 * @contributor Alexander Filatov <alex@dandelionlabs.io>
 * @contributor Leon Acosta <leon@dandelionlabs.io>
 */
require("dotenv").config();
const { initPools } = require("../modules/initPools")
const { log } = require("../modules/logger")
const { Factory, Pool } = require("../database/models");
const { getCurrentTimeString } = require("../utils/time")
const { timeOut } = require("../utils/timeOut")
const { sequelize } = require("../database/sequelize");
const simpleLogger = require("simple-node-logger").createSimpleLogger("app.log");

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
  simpleLogger.info(`${getCurrentTimeString()} - Sync started.`);
  await timeOut(2); // starts after 2 seconds

  const { networksToPools, web3list } = await initPools();

  while (true === true) {
    // TODO: control and await only after all networks are checked.
    // TODO: instead of control and await, maybe create different threads.

    // get smaller block number to update from pools and network
    for (const network of networksToPools.keys()) {
      const networkSync = await Factory.findAll({
        attributes: [[sequelize.fn('min', sequelize.col('Pools.syncedBlockHeight')), 'minSyncedBlockHeight'],],
        group: ['network'],
        include: [{ model: Pool, attributes: [] }],
        where: { 'network': network },
        raw: true
      });

      if (!networkSync) {
        console.log('No pools were found.');
        await timeOut(process.env.LISTENER_SLEEP_INTERVAL);
        continue;
      }

      const syncedBlockHeight = networkSync[0].minSyncedBlockHeight;

      const latestBlockNum = await web3list.get(network).eth.getBlockNumber()

      if (isNaN(parseInt(latestBlockNum))) {
        console.log("Failed to connect to web3.");
        // web3list[network] = blockchain.reInit(); TODO CHECK
        await timeOut(process.env.LISTENER_SLEEP_INTERVAL);
        continue;
      }

      // "from" can't be greater than "to"
      if (syncedBlockHeight > latestBlockNum) {
        simpleLogger.info(`${getCurrentTimeString()}: ${syncedBlockHeight} > ${latestBlockNum}, updating all pools with latest block num value.`);

        const factoryAddresses = Array.from(networksToPools.get(network).keys());
        // Set to the latest block number from the blockchain.
        await Pool.update({ syncedBlockHeight: latestBlockNum }, { where: { 'FactoryAddress': factoryAddresses } });
      }

      if (syncedBlockHeight < latestBlockNum) {
        simpleLogger.info(`${getCurrentTimeString()}: ${syncedBlockHeight} < ${latestBlockNum}`);
        await log(latestBlockNum, syncedBlockHeight, networksToPools.get(network), web3list.get(network));
      }

      simpleLogger.info(`${getCurrentTimeString()}: ${latestBlockNum} is synced`);

      // if "from" and "to" are matching, database synced up to latest block.
      // Wait for appearance of a new block
      await timeOut(process.env.LISTENER_SLEEP_INTERVAL);
    }
  }

  simpleLogger.info(`${getCurrentTimeString()} - Sync finished.`);
};

module.exports = { SyncByUpdate };
