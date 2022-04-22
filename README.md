# Token Linear Vesting indexer

This repository contains the indexer that keep track the Stakeholders list to serve in the Manager's admin application for the Token Linear Vesting product.

## About the source code

- [Getting Started](#getting-started)
  - [Requirements](#requirements)
  - [Restarting](#restarting)
- [Troubleshooting](#troubleshooting)
- [Collaborators](#collaborators)

## Getting Started

### Requirements

You will need node.js (12.\* or later) and npm installed to run it locally.

1. Import the repository and `cd` into the new directory.
2. Run `npm install`.
3. Copy the file `.env.example` to `.env`, and:
   - Add an `INFURA` or `ALCHEMY` url in `RPC_URL`.
   - Add a vesting factory smart contract address in `FACTORY_CONTRACT_ADDRESS`.
   - Add a `ETHERSCAN_API_KEY`
   - Add a postgres database parameters
5. Finally, run the bot `node index.js`.

### Restarting

If you want to restart the process and reload all the events again, you can simply delete the record with key `syncedBlockHeight` from the `Settings` table.

## Troubleshooting

If you have any questions, send them along with a hi to [hello@dandelionlabs.io](mailto:hello@dandelionlabs.io).

## Collaborators

Anyone can collaborate and improve this repository. Special thanks to all of those who contributed to the creation of it.

1. Medet Ahmetson <admin@blocklords.io>
2. Alexander Filatov <alex@dandelionlabs.io>
3. Leon Acosta <leon@dandelionlabs.io>
