require("dotenv").config();

const fs = require("fs");
const express = require("express");

const app = express();
const port = process.env.PORT || 4000;

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
    res.send(JSON.parse(fs.readFileSync(`./data/${poolName}.json`, "utf-8")));
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching the pool, probably doesn't exist");
  }
});

app.get("/config/pools", async (_req, res) => {
  try {
    res.send(JSON.parse(fs.readFileSync(`./config/poolsConfig.json`, "utf-8")));
  } catch (error) {
    console.log(error);
    res.status(500).send("Error, file does not exist");
  }
});

app.listen(port, () => {
  try {
    let sync = require("./sync");
    sync.SyncByUpdate();
  } catch (e) {
    process.exit(1);
  }
  console.log(`Listening at port ${port}`);
});
