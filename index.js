require("dotenv").config();

const express = require("express");
const { SyncByUpdate, web3 } = require("./blockchain/sync");
const { sequelize } = require("./database/sequelize");
const { QueryTypes } = require("sequelize");
const log = require("simple-node-logger").createSimpleLogger("logs.log");

const app = express();
const port = process.env.PORT || 4000;

const { Factory, Event, Pool } = require("./database/models");

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
        type: QueryTypes.SELECT,
      }
    );

    const finalList = [];
    // check for blacklisted
    for (let i = 0; i < stakeholders.length; i++) {
      finalList.push(stakeholders[i]);
      if (stakeholders[i].newOwner) {
        let addressToCheck = stakeholders[i].newOwner;
        // if blacklisted found
        while (addressToCheck) {
          const newStakeholder = {
            address: addressToCheck,
            amountlocked: stakeholders[i].amountlocked,
            amountClaimed: stakeholders[i].amountClaimed,
          };

          let newGrantee = await Event.findOne({
            where: {
              PoolAddress: poolAddress,
              name: "ChangeInvestor",
              returnValues: {
                oldOwner: addressToCheck,
              },
            },
          });
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
    log.error(error.message);
    res.status(500).send("Error fetching the pool, probably doesn't exist");
  }
});

app.get("/claims/:poolAddress/:userAddress", async (_req, res) => {
  const { poolAddress, userAddress } = _req.params;
  try {
    const claims = await Event.findAll({
      where: {
        PoolAddress: poolAddress,
        name: "GrantTokensClaimed",
        returnValues: {
          recipient: userAddress,
        },
      },
      attributes: [
        "timestamp",
        [sequelize.json("returnValues.amountClaimed"), "amountClaimed"],
      ],
      order: [["timestamp", "DESC"]],
    });

    res.send(claims);
  } catch (error) {
    console.log(error);
    log.error(error.message);
    res.status(500).send("Error fetching the pool, probably doesn't exist");
  }
});

app.get("/:poolAddress/blacklist", async (_req, res) => {
  const { poolAddress } = _req.params;
  try {
    const blacklist = await Event.findAll({
      where: {
        PoolAddress: poolAddress,
        name: "ChangeInvestor",
      },
      attributes: [[sequelize.json("returnValues.oldOwner"), "address"]],
    });

    res.send(blacklist);
  } catch (error) {
    console.log(error);
    log.error(error.message);
    res.status(500).send("Unexpected error");
  }
});

app.get("/:factoryAddress/pools", async (_req, res) => {
  const { factoryAddress } = _req.params;
  try {
    const pools = await Pool.findAll({
      include: [
        {
          model: Event,
          as: "Events",
          limit: 1,
          where: { name: "OwnershipTransferred" },
          order: [
            ["blockNumber", "DESC"],
            ["logIndex", "DESC"],
          ],
        },
        {
          model: Factory,
          where: { 'address': factoryAddress },
        },
      ],
    });

    const poolsAndOwners = [];
    for (let i = 0; i < pools.length; i++) {
      poolsAndOwners.push({
        name: pools[i].name,
        address: pools[i].address,
        start: pools[i].start,
        end: pools[i].end,
        owner: pools[i].Events
          ? pools[i].Events[0]?.returnValues.newOwner
          : undefined,
      });
    }

    res.send(poolsAndOwners);
  } catch (error) {
    console.log(error);
    log.error(error.message);
    res.status(500).send("Unexpected error");
  }
});


app.get("/:network/factories", async (_req, res) => {
  const { network } = _req.params;
  try {
    const factories = await Factory.findAll({
      where: { network },
      include: [
        {
          model: Pool,
          as: "Pools",
          include: [
            {
              model: Event,
              as: "Events",
              limit: 1,
              where: { name: "OwnershipTransferred" },
              order: [
                ["blockNumber", "DESC"],
                ["logIndex", "DESC"],
              ],
            },
          ]
        },
      ],
    });

    const enrichedFactories = [];

    for (const factory of factories) {
      console.log(factory.dataValues)
      const poolsAndOwners = [];
      for (const pool of factory.Pools) {
        poolsAndOwners.push({
          name: pool.name,
          address: pool.address,
          start: pool.start,
          end: pool.end,
          owner: pool.Events
              ? pool.Events[0]?.returnValues.newOwner
              : undefined,
        });
        enrichedFactories.push({
          address: factory.address,
          projectName: factory.projectName,
          logoUrl: factory.logoUrl,
          website: factory.website,
          pools: poolsAndOwners,
        })
      }
    }

    res.send(enrichedFactories);
  } catch (error) {
    console.log(error);
    log.error(error.message);
    res.status(500).send("Unexpected error");
  }
});


app.get("/networks", async (_req, res) => {
  try {
    const networks = await Factory.findAll({
      group: ['network'],
      attributes: ['network'],
    });

    res.send(networks.map((el)=> el.network));
  } catch (error) {
    console.log(error);
    log.error(error.message);
    res.status(500).send("Unexpected error");
  }
});

app.listen(port, async () => {
  try {
    SyncByUpdate();
  } catch (e) {
    console.log(e);
    log.error(error.message);
    process.exit(1);
  }
  console.log(`Listening at port ${port}`);
});
