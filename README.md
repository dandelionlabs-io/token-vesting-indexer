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
3. Copy the file `.env.example` to `.env`, and add the postgres database parameters.
4. Check the `constants/networks.js` and update the values for the networks that you are going to be using.
5. Check the `constants/factories.js` and upate the values for the factories you are going to be using.
6. Finally, run the bot `node index.js`.

### Adding your factory

If you have your own project and want your factory to be available within our community, add a record into `constant/factories.js` file. There you will have a space to specify the address, website, project name, and logo, to make it available in our platform for your community. Make sure you add the network parameters in `constants/networks.js` if you add new networks.

## Troubleshooting

If you have any questions, send them along with a hi to [hello@dandelionlabs.io](mailto:hello@dandelionlabs.io).

## Collaborators

Anyone can collaborate and improve this repository. Special thanks to all of those who contributed to the creation of it.

1. Medet Ahmetson <admin@blocklords.io>
2. Alexander Filatov <alex@dandelionlabs.io>
3. Leon Acosta <leon@dandelionlabs.io>
