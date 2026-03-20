import env from '../env.config.js';

// Sequelize dialect config for PostgreSQL
const postgresConfig = {
  dialect: 'postgres',
  host: env.pg.host,
  port: env.pg.port,
  username: env.pg.user,
  password: env.pg.password,
  database: env.pg.database,
  pool: {
    max: env.pg.max,
    min: env.pg.min,
    idle: env.pg.idleTimeoutMillis,
    acquire: 60000,
  },
  logging: false,
};

export default postgresConfig;
