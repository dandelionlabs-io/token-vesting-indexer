require("dotenv").config();

const fs = require("fs");
const express = require("express");
const { SyncByUpdate, web3 } = require("./sync");

const app = express();
const port = process.env.PORT || 4000;

const { Pool, Event } = require("./models");

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/", (_req, res) => {
  res.send("Token Linear Vesting Grant list!");
});

app.get("/:poolName", async (_req, res) => {
  const { poolName } = _req.params;
  try {
    const path = `./data/${poolName}.json`;
    if (fs.existsSync(path))
      res.send(JSON.parse(fs.readFileSync(path, "utf-8")));
    else res.send({});
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching the pool, probably doesn't exist");
  }
});

app.get("/:poolAddress/stakeholders", async (_req, res) => {
  const { poolAddress } = _req.params;
  try {
    const events = await Event.findAll({
      where: {
        PoolAddress: poolAddress,
        name: 'GrantAdded',
        returnValues: {
          recipient: userAddress
        }
      },
      order: [['timestamp', 'DESC']]
    });

    const claims = []

    for (let i = 0; i < events.length; i++) {
      claims.push({
        amount: web3.utils.fromWei(events[i].returnValues.amount.toString(), "ether"),
        timestamp: events[i].timestamp
      })
    }

    res.send(claims);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching the pool, probably doesn't exist");
  }
});

app.get("/:poolAddress/claims/:userAddress", async (_req, res) => {
  const { poolAddress, userAddress } = _req.params;
  try {
    const events = await Event.findAll({
      where: {
        PoolAddress: poolAddress,
        name: 'GrantTokensClaimed',
        returnValues: {
          recipient: userAddress
        }
      },
      order: [['timestamp', 'DESC']]
    });

    const claims = []

    for (let i = 0; i < events.length; i++) {
      claims.push({
        amount: web3.utils.fromWei(events[i].returnValues.amountClaimed.toString(), "ether"),
        timestamp: events[i].timestamp
      })
    }

    res.send(claims);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching the pool, probably doesn't exist");
  }
});

app.get("/pools", async (_req, res) => {
  try {
    const pools = await Pool.findAll({
      include: [{
        model: Event,
        as: "Events",
        limit: 1,
        where: { name: 'OwnershipTransferred' },
        order: [
          ['blockNumber', 'DESC'],
          ['logIndex', 'DESC'],
        ]
      }]
    });

    const poolsAndOwners = [];
    for (let i = 0; i < pools.length; i++) {
      poolsAndOwners.push({
        name: pools[i].name,
        address: pools[i].address,
        start: pools[i].start,
        end: pools[i].end,
        owner: pools[i].Events ? pools[i].Events[0].returnValues.newOwner : undefined,
      })
    }

    res.send(poolsAndOwners);
  } catch (error) {
    console.log(error);
    res.status(500).send("Unexpected error");
  }
});

app.listen(port, () => {
  try {
    SyncByUpdate();
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
  console.log(`Listening at port ${port}`);
});
