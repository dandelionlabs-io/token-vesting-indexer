const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.MYSQL_DATABASE_NAME,
    process.env.MYSQL_DATABASE_USER,
    process.env.MYSQL_DATABASE_PASSWORD,
    {
        host: process.env.MYSQL_DATABASE_HOST,
        dialect: process.env.MYSQL_DATABASE_DIALECT,
        logging: false,
    }
);

module.exports = { sequelize };
