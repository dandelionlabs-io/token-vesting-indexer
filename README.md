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
   - Replace `REMOTE_HTTP` with an INFURA or ALCHEMY url.
   - Add pools and duration in the file `./config/index.js`.
4. Replace the `syncedBlockHeight` property value in `config/sync-status.json` with the Block Number of earlier Pool's deployed Transaction number.
5. Finally, run the bot `node index.js`.

### Restarting

1. Make sure you remove any `.json` files from the folder `./data`.
2. Replace the `syncedBlockHeight` property value in `config/sync-status.json` with the Block Number of earlier Pool's deployed Transaction number.

## Troubleshooting

If you have any questions, send them along with a hi to [hello@dandelionlabs.io](mailto:hello@dandelionlabs.io).

## Collaborators
Anyone can collaborate and improve this repository. Special thanks to all of those who contributed to the creation of it.

1. Medet Ahmetson <admin@blocklords.io>
2. Leon Acosta <leon@dandelionlabs.io>
