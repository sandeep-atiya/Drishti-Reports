import { Sequelize } from 'sequelize';
import mssqlConfig from '../config/db/mssql.config.js';
import logger from '../utils/logger.js';

// Instance created eagerly (no network call yet); authenticate() is called in server.js
const sequelize = new Sequelize(mssqlConfig);

export const connectMSSQL = async () => {
  await sequelize.authenticate();
  logger.info('MSSQL connected successfully via Sequelize', {
    host: mssqlConfig.host,
    database: mssqlConfig.database,
  });
  return sequelize;
};

export const getMSSQLSequelize = () => sequelize;

export const closeMSSQL = async () => {
  await sequelize.close();
  logger.info('MSSQL connection closed');
};
