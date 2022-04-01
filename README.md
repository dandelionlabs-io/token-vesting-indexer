# PolkaFantasy's Sync bot
This repository contains the Script that tracks the Investors list to serve in Manager's list.

## About the source code

- [Getting Started](#getting-started)
  - [Requirements](#requirements)
  - [Deploy Vesting Period](#deploy-vesting-period)
  - [Deploy Token example (Testing purposes)](#deploy-token-example)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Requirements
You will need node.js (12.* or later) and npm installed to run it locally.

1. Import the repository and `cd` into the new directory.
2. Run `npm install`.
3. Copy the file `.env.example` to `.env`, and:
   - Replace `REMOTE_HTTP` with an INFURA or ALCHEMY url.
   - Replace `PRIVATE_SALE_ADDRESS` with the address of an instance of the VestingPeriod contract for *Private Sale* pool.
   - Replace `CHAIN_GUARDIAN_ADDRESS` with the address of an instance of the VestingPeriod contract for *Chain Guardian* pool.
   - Replace `TRUST_PAD_ADDRESS` with the address of an instance of the VestingPeriod contract for *Trust Pad* pool.
   - Replace `PRIVATE_SALE_DURATION` with the Pool duration in Seconds.
   - Replace `CHAIN_GUARDIAN_DURATION` with the Pool duration in Seconds.
   - Replace `TRUST_PAD_DURATION` with the Pool duration in Seconds.
4. Replace the `syncedBlockHeight` property value in `public/conf.json` with the Block Number of earliest Pool's deployed Transaction number.
5. Clean the already added managers in the following lists:
    - Replace the content of `public/private-sale.json` with `{}`
    - Replace the content of `public/chain-guardian.json` with `{}`
    - Replace the content of `public/trust-pad.json` with `{}`
6. Finally run the bot `node sync.js`.

## Troubleshooting

If you have any questions, send them along with a hi to hello@dandelionlabs.io.
