const { DataTypes } = require("sequelize");
const { sequelize } = require("./sequelize");

const Factory = sequelize.define(
    "Factory",
    {
        initialBlockHeight: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        projectName: {
            type: DataTypes.STRING
        },
        logoUrl: {
            type: DataTypes.STRING
        },
        website: {
            type: DataTypes.STRING
        },
        network: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
    }
);

const Pool = sequelize.define(
    "Pool",
    {
        address: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        start: {
            type: DataTypes.INTEGER,
        },
        end: {
            type: DataTypes.INTEGER,
        },
        syncedBlockHeight: {
            type: DataTypes.INTEGER,
        },
    }
);

Factory.hasMany(Pool);
Pool.belongsTo(Factory);

const Event = sequelize.define(
    "Event",
    {
        name: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        blockNumber: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        logIndex: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        returnValues: {
            allowNull: false,
            type: DataTypes.JSONB,
        },
        timestamp:{
            allowNull: false,
            type: DataTypes.INTEGER,
        },
    }
);

Pool.hasMany(Event);
Event.belongsTo(Pool);

sequelize.sync();

module.exports = { Factory, Event, Pool };
