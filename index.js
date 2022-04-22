require("dotenv").config();

const fs = require("fs");
const express = require("express");
const { SyncByUpdate, web3 } = require("./blockchain/sync");
const { sequelize } = require("./database/sequelize");
const { QueryTypes } = require('sequelize');

const app = express();
const port = process.env.PORT || 4000;

const { Pool, Event } = require("./database/models");

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/", (_req, res) => {
  res.send("Token Linear Vesting Grant list!");
});

app.get("/:poolAddress/stakeholders", async (_req, res) => {
  const { poolAddress } = _req.params;
  try {
    const stakeholders = await sequelize.query(
        `SELECT "Event"."returnValues"->>'recipient' as address,
                SUM(("Event"."returnValues"->>'amount')::numeric) as amountLocked,
                (SELECT SUM(("ch"."returnValues"->>'amountClaimed')::numeric)
                   FROM "Events" AS "ch"
                  WHERE "ch"."returnValues"->>'recipient' = min("Event"."returnValues"->>'recipient')
                    AND "ch"."name" = 'GrantTokensClaimed'
                    AND "ch"."PoolAddress" = :poolAddress) AS "amountClaimed",
                (SELECT COALESCE("ch"."returnValues"->>'newOwner', 'true')
                   FROM "Events" AS "ch"
                  WHERE "ch"."returnValues"->>'oldOwner' = min("Event"."returnValues"->>'recipient')
                    AND "ch"."name" = 'ChangeInvestor'
                    AND "ch"."PoolAddress" = :poolAddress) AS "newOwner"
           FROM "Events" AS "Event"
          WHERE "Event"."PoolAddress" = :poolAddress
            AND "Event"."name" = 'GrantAdded'
          GROUP BY "returnValues"->>'recipient'`,
        {
          replacements: { poolAddress },
          type: QueryTypes.SELECT
        }
    );

    const finalList = [];
    // check for blacklisted
    for (let i = 0; i < stakeholders.length; i++) {
      finalList.push(stakeholders[i]);
      if(stakeholders[i].newOwner) {
        let addressToCheck = stakeholders[i].newOwner;
        // if blacklisted found
        while (addressToCheck) {
          const newStakeholder = {
            address: addressToCheck,
            amountlocked: stakeholders[i].amountlocked,
            amountClaimed: stakeholders[i].amountClaimed
          }

          let newGrantee = await Event.findOne({
            where: {
              PoolAddress: poolAddress,
              name: 'ChangeInvestor',
              returnValues: {
                oldOwner: addressToCheck
              }
            }
          })
          // add new stakeholder with old values to the list
          if (newGrantee) {
            addressToCheck = newGrantee.returnValues.newOwner;
            newStakeholder.newOwner = newGrantee.returnValues.newOwner;
          } else {
            addressToCheck = null;
            newStakeholder.newOwner = null;
          }
          finalList.push(newStakeholder);
        }
      }
    }

    res.send(finalList);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching the pool, probably doesn't exist");
  }
});

app.get("/claims/:poolAddress/:userAddress", async (_req, res) => {
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
        amount: events[i].returnValues.amountClaimed,
        timestamp: events[i].timestamp
      })
    }

    res.send(claims);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching the pool, probably doesn't exist");
  }
});

app.get("/:poolAddress/blacklist", async (_req, res) => {
  const { poolAddress } = _req.params;
  try {
    const events = await Event.findAll({
      where: {
        PoolAddress: poolAddress,
        name: 'ChangeInvestor'
      }
    });

    const blacklist = []

    for (let i = 0; i < events.length; i++) {
      blacklist.push(events[i].returnValues.oldOwner)
    }

    res.send(blacklist);
  } catch (error) {
    console.log(error);
    res.status(500).send("Unexpected error");
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

app.listen(port, async () => {
  try {
    SyncByUpdate();
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
  console.log(`Listening at port ${port}`);
});
