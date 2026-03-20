import { Sequelize } from 'sequelize';
import postgresConfig from '../config/db/postgres.config.js';
import logger from '../utils/logger.js';

// Instance created eagerly (no network call yet); authenticate() is called in server.js
const sequelize = new Sequelize(postgresConfig);

export const connectPostgres = async () => {
  await sequelize.authenticate();
  logger.info('PostgreSQL connected successfully via Sequelize', {
    host: postgresConfig.host,
    database: postgresConfig.database,
  });
  return sequelize;
};

export const getPGSequelize = () => sequelize;

export const closePG = async () => {
  await sequelize.close();
  logger.info('PostgreSQL connection closed');
};
