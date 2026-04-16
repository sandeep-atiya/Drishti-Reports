import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve .env relative to this file (src/config/ → ../../.env = backend/.env)
// This works correctly under IIS/iisnode where process.cwd() is unpredictable.
dotenv.config({ path: resolve(__dirname, '../../.env') });

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

  redis: {
    host:     process.env.REDIS_HOST     || '127.0.0.1',
    port:     parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USER     || undefined,
    db:       parseInt(process.env.REDIS_DB, 10)  || 0,
  },

  // Date range (days) above which the report is processed as a background job
  LARGE_RANGE_DAYS: parseInt(process.env.LARGE_RANGE_DAYS, 10) || 90,

  // How often to re-sync SQLite from PG + MSSQL (milliseconds)
  SYNC_INTERVAL_MS: (parseInt(process.env.SYNC_INTERVAL_MINUTES, 10) || 60) * 60 * 1000,

  jwt: {
    secret:    process.env.JWT_SECRET    || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  aes: {
    key:  process.env.AES_KEY  || '',
    salt: process.env.AES_SALT || '49,76,61,6e,20,4d,65,64,76,65,64,65,76',
  },
};

export default env;
