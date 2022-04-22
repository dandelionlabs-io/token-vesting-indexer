const { DataTypes } = require("sequelize");
const { sequelize } = require("./sequelize");

const Settings = sequelize.define(
    "Settings",
    {
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        value: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        timestamps: false,
    }
);

const Pool = sequelize.define(
    "Pool",
    {
        factoryAddress: {
            type: DataTypes.STRING,
            allowNull: false,
        },
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
    },
    {
        timestamps: false,
    }
);

const Event = sequelize.define(
    "Event",
    {
        name: {
            type: DataTypes.ENUM,
            values: ['GrantAdded', 'GrantTokensClaimed', 'ChangeInvestor', 'OwnershipTransferred'],
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
            type: DataTypes.JSONB,
        },
        timestamp:{
            type: DataTypes.INTEGER,
        },
    },
    { timestamps: false }
);

Pool.hasMany(Event);
Event.belongsTo(Pool);

sequelize.sync();

module.exports = { Event, Pool, Settings };
