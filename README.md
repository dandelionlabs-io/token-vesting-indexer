# Token Linear Vesting indexer

This repository contains the indexer that keep track the Stakeholders list to serve in the Manager's admin application for the Token Linear Vesting product.

## About the source code

- [Getting Started](#getting-started)
  - [Requirements](#requirements)
  - [Adding your Factory](#adding-your-factory)
- [Troubleshooting](#troubleshooting)
- [Collaborators](#collaborators)

## Getting Started

### Requirements

You will need node.js (12.\* or later) and npm installed to run it locally.

1. Import the repository and `cd` into the new directory.
2. Run `npm install`.
3. Copy the file `.env.example` to `.env`, and:
   - Input an INFURA or ALCHEMY url in `REMOTE_HTTP`.
   - Input a vesting factory smart contract address in `FACTORY_CONTRACT_ADDRESS`.
4. Replace the `syncedBlockHeight` property value in `config/sync-status.json` with the Block Number of Factory's deployed Transaction number.
5. Finally, run the bot `node index.js`.

### Adding your factory

If you have your own project and want your factory to be available within our community, add a record into `database/factories.js` file. There you will have a space to specify the address, website, project name, and logo, to make it available in our platform for your community.

## Troubleshooting

If you have any questions, send them along with a hi to [hello@dandelionlabs.io](mailto:hello@dandelionlabs.io).

## Collaborators

Anyone can collaborate and improve this repository. Special thanks to all of those who contributed to the creation of it.

1. Medet Ahmetson <admin@blocklords.io>
2. Leon Acosta <leon@dandelionlabs.io>
