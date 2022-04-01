/**
 * Entry point. It serves the data, and reinstalls the code.
 */
require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()
const port = process.env.PORT || 4000;

app.use(cors()); // <---- use cors middleware
app.use(express.static('public'))

app.get('/', (_req, res) => {
  res.send('PolkaFantasy Grant list!')
})

app.listen(port, () => {
    try {
        let sync = require('./sync');
        sync.SyncByUpdate();
    } catch (e) {
        process.exit(1);
    }
    console.log(`Listening at http://localhost:${port}`)
})