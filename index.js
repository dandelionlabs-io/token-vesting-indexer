require("dotenv").config();

const express = require("express");
const { SyncByUpdate, web3 } = require("./blockchain/sync");
const { sequelize } = require("./database/sequelize");
const { QueryTypes } = require("sequelize");
const { Op } = require("sequelize");
const { roleCodeToName } = require("./constants/roles");
const log = require("simple-node-logger").createSimpleLogger("logs.log");

const app = express();
const port = process.env.PORT || 4000;

const { Factory, Event, Pool } = require("./database/models");

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/", (_req, res) => {
  res.send("Token Linear Vesting backend is running!");
});

/**
 * @API get pool stakeholders for the combination network, factory address and pool address
 */
app.get("/:network/:poolAddress/stakeholders", async (_req, res) => {
  const { network, poolAddress } = _req.params;
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
          INNER JOIN "Pools" AS "Pool" ON "Pool"."address" = "Event"."PoolAddress"
          INNER JOIN "Factories" AS "Factory" ON "Factory"."address" = "Pool"."FactoryAddress"
          WHERE "Event"."PoolAddress" = :poolAddress
            AND "Event"."name" = 'GrantAdded'
            AND "Factory"."network" = :network
          GROUP BY "returnValues"->>'recipient'`,
      {
        replacements: { poolAddress, network },
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
            amountLocked: stakeholders[i].amountLocked,
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

/**
 * @API list claims of users for the combination network, factory address and pool address
 */
app.get("/:network/:poolAddress/claims/:userAddress", async (_req, res) => {
  const { network, poolAddress, userAddress } = _req.params;
  try {
    const claims = await Event.findAll({
      include: [
        {
          model: Pool,
          attributes: [],
          where: { address: poolAddress },
          include: [
            {
              model: Factory,
              attributes: [],
              where: { network: network },
            },
          ],
        },
      ],
      where: {
        PoolAddress: poolAddress,
        name: "GrantTokensClaimed",
        returnValues: {
          recipient: { [Op.iLike]: userAddress },
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
      attributes: ["name", "address", "start", "end"],
      include: [
        {
          model: Event,
          as: "Events",
          attributes: ["returnValues", "name"],
          where: { name: ["RoleGranted", "RoleRevoked"] },
          order: [
            ["blockNumber", "DESC"],
            ["logIndex", "DESC"],
          ],
        },
        {
          model: Factory,
          attributes: [],
          where: { address: factoryAddress },
        },
      ],
    });

    res.send(
      pools.map((pool) => {
        const managers = new Map();

        // assign operators as they come ordered on the events, if they have been granted and revoked,
        // they will be updated with only the last value
        for (const event of pool.Events) {
          const manager = event.dataValues.returnValues.account;
          // check the role types
          const role = event.dataValues.returnValues.role;
          if (!managers.get(manager)) managers.set(manager, new Map());

          managers
            .get(manager)
            .set(
              roleCodeToName(role),
              event.name === "RoleGranted" ? true : false
            );
        }

        const managerResponse = [];
        for (const manager of managers) {
          const roles = [];
          for (const role of manager[1]) {
            if (role[1]) roles.push(role[0]);
          }
          if (roles.length > 0) managerResponse.push([manager[0], roles]);
        }

        return {
          name: pool.name,
          address: pool.address,
          start: pool.start,
          end: pool.end,
          managers: managerResponse,
        };
      })
    );
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
          ],
        },
      ],
    });

    const enrichedFactories = [];

    for (const factory of factories) {
      console.log(factory.dataValues);
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
        });
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
      group: ["network"],
      attributes: ["network"],
    });

    res.send(networks.map((el) => el.network));
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
          ],
        },
      ],
    });

    const enrichedFactories = [];

    for (const factory of factories) {
      console.log(factory.dataValues);
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
        });
      }
    }

    res.send(enrichedFactories);
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
