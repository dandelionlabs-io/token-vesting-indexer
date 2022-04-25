const fs = require("fs");

const blockchain = require("../blockchain/blockchain");
const factories = require("../constants/factories");
const networks = require("../constants/networks");
const { getFirstTransaction } = require("../utils/etherScanHelper")
const { Factory, Pool } = require("../database/models");

const factoryABI = JSON.parse(fs.readFileSync("abis/factory.json", "utf-8"));
const vestingPoolABI = JSON.parse(fs.readFileSync("abis/vesting.json", "utf-8"));

const web3list = new Map();

const initFactory = async (factoryInfo) => {
    // create web3 instance depending on the network
    if (!web3list.get(factoryInfo.network)) {
        const networkInformation = networks[factoryInfo.network];
        web3list.set(factoryInfo.network, blockchain.reInit(networkInformation.rpcUrl))
    }

    // check if factory exists, if not creates it
    let factory = await Factory.findByPk(factoryInfo.address);

    if (!factory) {
        const dataftx = await getFirstTransaction(factoryInfo.network, factoryInfo.address)
        factory = await Factory.create({
            address: factoryInfo.address,
            projectName: factoryInfo.projectName,
            logoUrl: factoryInfo.logoUrl,
            website: factoryInfo.website,
            initialBlockHeight: dataftx?.data.result[0].blockNumber,
            network: factoryInfo.network,
        });
        console.log(`Created new factory instance in database: ${factory.network} - ${factory.address}`)
    }

    const factoryContract = blockchain.loadContract(
        web3list.get(factoryInfo.network),
        factoryInfo.address,
        factoryABI
    )

    return { factory, factoryContract }
}

const initPools = async () => {
    console.log('Initiating pools...');

    const networksToPools = new Map()

    for (let factoryIndex = 0; factoryIndex < factories.length; factoryIndex++) {
        const factoryInfo = factories[factoryIndex];

        const { factory, factoryContract } = await initFactory(factoryInfo, );

        // get all pool address belonging to that factory contract in that network
        const addresses = await factoryContract.methods.getPools().call();
        const newPools = []

        let syncedBlockHeight = factory.initialBlockHeight;
        for (let i = 0; i < addresses.length; i++) {

            const poolAddress = addresses[i];
            const poolContract = blockchain.loadContract(web3list.get(factory.network), poolAddress, vestingPoolABI);
            const poolData = await poolContract.methods.pool().call();

            let pool = await Pool.findByPk(poolAddress);
            // create pool if does not exist in database
            if (!pool) {
                pool = await Pool.create({
                    name: poolData.name,
                    address: poolAddress,
                    start: poolData.startTime,
                    end: poolData.endTime,
                    FactoryAddress: factory.address,
                    syncedBlockHeight: factory.initialBlockHeight
                });
                console.log(`Created new pool: ${factory.network} - ${poolAddress}`)
            }
            newPools.push(poolContract);
        }

        if (!networksToPools.has(factory.network))
            networksToPools.set(factory.network, new Map())
        const oldPools = networksToPools.get(factory.network).get(factory.address);
        if (!oldPools)
            networksToPools.get(factory.network).set(factory.address, newPools);
        else {
            oldPools.push(newPools)
        }
    }

    console.log('Pools have been initiated...');
    return { networksToPools, web3list };
}

module.exports = { initPools };
