import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = path.join(__dirname, '../../data');
const DB_PATH    = path.join(DATA_DIR, 'reports_cache.db');

let db = null;

// Increment this whenever a query change means the cached call counts are no
// longer accurate (e.g. switching COUNT(*) → COUNT(DISTINCT ch_call_id)).
// On mismatch the calls_daily table is wiped so the next sync re-builds it
// from scratch with the correct formula.
const CALLS_SCHEMA_VERSION    = '2';  // bumped: COUNT(*) → COUNT(DISTINCT ch_call_id)
const TRANSFER_SCHEMA_VERSION = '3';  // bumped: removed hangup/call_drop/talk_time filters
const HANGUP_SCHEMA_VERSION   = '2';  // bumped: username → udh_user_id as primary identifier

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
      udh_user_id           TEXT    NOT NULL DEFAULT '',
      campaign_name         TEXT    NOT NULL DEFAULT '',
      agent_hangup_phone    INTEGER NOT NULL DEFAULT 0,
      agent_hangup_ui       INTEGER NOT NULL DEFAULT 0,
      customer_hangup_phone INTEGER NOT NULL DEFAULT 0,
      system_hangup         INTEGER NOT NULL DEFAULT 0,
      system_media          INTEGER NOT NULL DEFAULT 0,
      system_recording      INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (summary_date, udh_user_id, campaign_name)
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
    // ── Schema version guard ───────────────────────────────────────────────
    // If the stored version doesn't match CALLS_SCHEMA_VERSION, the calls_daily
    // cache was built with an old (incorrect) formula.  Wipe it so the sync job
    // re-populates it with the correct COUNT(DISTINCT ch_call_id) values.
    const storedVer = db
      .prepare("SELECT value FROM sync_meta WHERE key = 'calls_schema_version'")
      .get();
    if (!storedVer || storedVer.value !== CALLS_SCHEMA_VERSION) {
      logger.warn('[SQLite] calls_schema_version mismatch — clearing calls_daily for full re-sync');
      db.prepare('DELETE FROM calls_daily').run();
      db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('calls_schema_version', ?)")
        .run(CALLS_SCHEMA_VERSION);
    }

    const storedTransferVer = db
      .prepare("SELECT value FROM sync_meta WHERE key = 'transfer_schema_version'")
      .get();
    if (!storedTransferVer || storedTransferVer.value !== TRANSFER_SCHEMA_VERSION) {
      logger.warn('[SQLite] transfer_schema_version mismatch — clearing transfer_daily for full re-sync');
      db.prepare('DELETE FROM transfer_daily').run();
      db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('transfer_schema_version', ?)")
        .run(TRANSFER_SCHEMA_VERSION);
    }

    const storedHangupVer = db
      .prepare("SELECT value FROM sync_meta WHERE key = 'hangup_schema_version'")
      .get();
    if (!storedHangupVer || storedHangupVer.value !== HANGUP_SCHEMA_VERSION) {
      logger.warn('[SQLite] hangup_schema_version mismatch — rebuilding hangup_daily for full re-sync');
      db.prepare('DROP TABLE IF EXISTS hangup_daily').run();
      db.exec(`
        CREATE TABLE IF NOT EXISTS hangup_daily (
          summary_date          TEXT    NOT NULL,
          udh_user_id           TEXT    NOT NULL DEFAULT '',
          campaign_name         TEXT    NOT NULL DEFAULT '',
          agent_hangup_phone    INTEGER NOT NULL DEFAULT 0,
          agent_hangup_ui       INTEGER NOT NULL DEFAULT 0,
          customer_hangup_phone INTEGER NOT NULL DEFAULT 0,
          system_hangup         INTEGER NOT NULL DEFAULT 0,
          system_media          INTEGER NOT NULL DEFAULT 0,
          system_recording      INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (summary_date, udh_user_id, campaign_name)
        );
        CREATE INDEX IF NOT EXISTS idx_hangup_date ON hangup_daily (summary_date);
      `);
      db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('hangup_schema_version', ?)")
        .run(HANGUP_SCHEMA_VERSION);
    }

    logger.info('[SQLite] Ready at ' + DB_PATH);
  }
  return db;
};

export const closeSQLite = () => {
  if (db) { db.close(); db = null; }
};
