const { Event } = require("../database/models");

const logSync = async (dataName, arr, web3) => {
  const blockTimestamps = new Map();
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
};

module.exports = {
  logSync,
};
