require("dotenv").config();

const fs = require('fs');
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());

app.get("/", (_req, res) => {
  res.send("DegenGang Grant list!");
});

app.get("/:poolName", async (_req, res) => {
  const { poolName } = _req.params;
  try {
    res.send(JSON.parse(fs.readFileSync(`./data/${poolName}.json`, 'utf-8')));
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching the pool, probably doesn't exist");
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
