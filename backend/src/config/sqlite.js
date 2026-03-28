import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = path.join(__dirname, '../../data');
const DB_PATH    = path.join(DATA_DIR, 'reports_cache.db');

let db = null;

const initSchema = (db) => {
  db.exec(`
    -- Pre-aggregated calls per agent per day (from PostgreSQL)
    CREATE TABLE IF NOT EXISTS calls_daily (
      summary_date  TEXT    NOT NULL,
      udh_user_id   TEXT    NOT NULL DEFAULT '',
      username      TEXT,
      campaign_name TEXT    NOT NULL,
      campaign_id   TEXT    NOT NULL,
      calls         INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (summary_date, udh_user_id, campaign_name, campaign_id)
    );
    CREATE INDEX IF NOT EXISTS idx_calls_date ON calls_daily (summary_date);

    -- Pre-aggregated orders per agent per day (from MSSQL)
    CREATE TABLE IF NOT EXISTS orders_daily (
      summary_date    TEXT    NOT NULL,
      campaign_id     INTEGER NOT NULL,
      agent_id        INTEGER NOT NULL,
      orders          INTEGER NOT NULL DEFAULT 0,
      verified        INTEGER NOT NULL DEFAULT 0,
      verified_amount REAL    NOT NULL DEFAULT 0,
      PRIMARY KEY (summary_date, campaign_id, agent_id)
    );
    CREATE INDEX IF NOT EXISTS idx_orders_date_campaign ON orders_daily (summary_date, campaign_id);

    -- Tracks sync state
    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    -- Pre-aggregated Transfer Conversion data per campaign per day (from PostgreSQL)
    CREATE TABLE IF NOT EXISTS transfer_daily (
      summary_date      TEXT    NOT NULL,
      campaign_name     TEXT    NOT NULL,
      calls             INTEGER NOT NULL DEFAULT 0,
      transfer_to_sales INTEGER NOT NULL DEFAULT 0,
      transfer_phones   TEXT    NOT NULL DEFAULT '[]',
      PRIMARY KEY (summary_date, campaign_name)
    );
    CREATE INDEX IF NOT EXISTS idx_transfer_date ON transfer_daily (summary_date);

    -- Pre-aggregated Self Hangup counts per agent per day (from PostgreSQL)
    CREATE TABLE IF NOT EXISTS hangup_daily (
      summary_date          TEXT    NOT NULL,
      username              TEXT    NOT NULL,
      campaign_name         TEXT    NOT NULL DEFAULT '',
      agent_hangup_phone    INTEGER NOT NULL DEFAULT 0,
      agent_hangup_ui       INTEGER NOT NULL DEFAULT 0,
      customer_hangup_phone INTEGER NOT NULL DEFAULT 0,
      system_hangup         INTEGER NOT NULL DEFAULT 0,
      system_media          INTEGER NOT NULL DEFAULT 0,
      system_recording      INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (summary_date, username, campaign_name)
    );
    CREATE INDEX IF NOT EXISTS idx_hangup_date ON hangup_daily (summary_date);
  `);
};

export const getSQLite = () => {
  if (!db) {
    mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');   // concurrent reads while writing
    db.pragma('synchronous  = NORMAL');
    db.pragma('cache_size   = -65536'); // 64 MB in-memory page cache
    db.pragma('temp_store   = MEMORY');
    initSchema(db);
    logger.info('[SQLite] Ready at ' + DB_PATH);
  }
  return db;
};

export const closeSQLite = () => {
  if (db) { db.close(); db = null; }
};
