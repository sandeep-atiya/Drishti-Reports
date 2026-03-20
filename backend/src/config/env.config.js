import dotenv from 'dotenv';

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,

  mssql: {
    host: process.env.MSSQL_HOST,
    port: parseInt(process.env.MSSQL_PORT, 10) || 1433,
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DB,
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
    pool: {
      max: parseInt(process.env.MSSQL_POOL_MAX, 10) || 10,
      min: parseInt(process.env.MSSQL_POOL_MIN, 10) || 0,
      idleTimeoutMillis: parseInt(process.env.MSSQL_POOL_IDLE, 10) || 60000,
    },
  },

  pg: {
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT, 10) || 5432,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DB,
    max: parseInt(process.env.PG_POOL_MAX, 10) || 10,
    min: parseInt(process.env.PG_POOL_MIN, 10) || 0,
    idleTimeoutMillis: parseInt(process.env.PG_POOL_IDLE, 10) || 60000,
  },
};

export default env;
