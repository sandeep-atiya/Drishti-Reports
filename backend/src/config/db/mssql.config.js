import env from '../env.config.js';

// Sequelize dialect config for MSSQL (tedious driver)
const mssqlConfig = {
  dialect: 'mssql',
  host: env.mssql.host,
  port: env.mssql.port,
  username: env.mssql.user,
  password: env.mssql.password,
  database: env.mssql.database,
  pool: {
    max: env.mssql.pool.max,
    min: env.mssql.pool.min,
    idle: env.mssql.pool.idleTimeoutMillis,
    acquire: 60000,
  },
  dialectOptions: {
    options: {
      encrypt: env.mssql.encrypt,
      trustServerCertificate: env.mssql.trustServerCertificate,
      requestTimeout: 30000,
    },
  },
  logging: false,
};

export default mssqlConfig;
