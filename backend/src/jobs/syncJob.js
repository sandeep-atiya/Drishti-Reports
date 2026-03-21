import dayjs from 'dayjs';
import { QueryTypes } from 'sequelize';
import { getSQLite } from '../config/sqlite.js';
import { getMSSQLSequelize, getPGSequelize } from '../connections/index.js';
import logger from '../utils/logger.js';

const CAMPAIGN_NAMES_SQL = `'Digital inbound', 'Inbound_2'`;

// In-memory flag — true once the first full sync finishes
let syncReady = false;
export const isSyncReady = () => syncReady;

// ── Helpers ──────────────────────────────────────────────────────────────────

const getLastSyncDate = (db) => {
  const row = db.prepare("SELECT value FROM sync_meta WHERE key = 'last_sync_date'").get();
  return row ? row.value : null;
};

const setLastSyncDate = (db, date) => {
  db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync_date', ?)").run(date);
};

// ── Pull calls from PostgreSQL ────────────────────────────────────────────────

const syncCalls = async (db, syncFrom) => {
  const dateFilter = syncFrom ? `AND ch_date_added >= '${syncFrom}'::date` : '';
  const label = syncFrom ? `since ${syncFrom}` : 'FULL (first time)';
  logger.info(`[SyncJob] PG calls ${label}`);

  const rows = await getPGSequelize().query(
    `SELECT
       ch_date_added::date              AS summary_date,
       COALESCE(udh_user_id, '')        AS udh_user_id,
       username,
       campaign_name,
       ch_campaign_id                   AS campaign_id,
       COUNT(*)                         AS calls
     FROM acd_interval_denormalized_entity
     WHERE
       ch_system_disposition = 'CONNECTED'
       AND campaign_name IN (${CAMPAIGN_NAMES_SQL})
       AND ch_hangup_details NOT IN ('Customer_Hangup_Phone', 'Customer_hangup_ui')
       AND udh_disposition_code IS DISTINCT FROM 'Call_Drop'
       AND uch_talk_time > 5
       ${dateFilter}
     GROUP BY ch_date_added::date, udh_user_id, username, campaign_name, ch_campaign_id`,
    { type: QueryTypes.SELECT }
  );

  logger.info(`[SyncJob] PG returned ${rows.length} call rows`);

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO calls_daily
      (summary_date, udh_user_id, username, campaign_name, campaign_id, calls)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction((rows) => {
    for (const r of rows) {
      upsert.run(
        String(r.summary_date),
        r.udh_user_id || '',
        r.username    || null,
        r.campaign_name,
        String(r.campaign_id),
        Number(r.calls)
      );
    }
  })(rows);
};

// ── Pull orders from MSSQL ────────────────────────────────────────────────────

const syncOrders = async (db, syncFrom) => {
  const dateFilter = syncFrom ? `AND createdOn >= CAST('${syncFrom}' AS DATETIME)` : '';
  const label = syncFrom ? `since ${syncFrom}` : 'FULL (first time)';
  logger.info(`[SyncJob] MSSQL orders ${label}`);

  const rows = await getMSSQLSequelize().query(
    `SELECT
       CAST(createdOn AS DATE)                                                           AS summary_date,
       campaign_Id,
       AgentID,
       COUNT(*)                                                                          AS orders,
       SUM(CASE WHEN disposition_Code = 'Verified' THEN 1    ELSE 0    END)             AS verified,
       SUM(CASE WHEN disposition_Code = 'Verified' THEN ISNULL(total_amount,0) ELSE 0 END) AS verified_amount
     FROM tblOrderDetails
     WHERE 1=1 ${dateFilter}
     GROUP BY CAST(createdOn AS DATE), campaign_Id, AgentID`,
    { type: QueryTypes.SELECT }
  );

  logger.info(`[SyncJob] MSSQL returned ${rows.length} order rows`);

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO orders_daily
      (summary_date, campaign_id, agent_id, orders, verified, verified_amount)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction((rows) => {
    for (const r of rows) {
      upsert.run(
        String(r.summary_date),
        Number(r.campaign_Id),
        Number(r.AgentID),
        Number(r.orders),
        Number(r.verified),
        Number(r.verified_amount)
      );
    }
  })(rows);
};

// ── Main sync ─────────────────────────────────────────────────────────────────

export const runSync = async () => {
  const db     = getSQLite();
  const lastSync = getLastSyncDate(db);

  // Incremental: go back 2 days to catch any late-arriving records
  const syncFrom = lastSync
    ? dayjs(lastSync).subtract(2, 'day').format('YYYY-MM-DD')
    : null; // null = full historical sync (first time only)

  const t0 = Date.now();
  logger.info('[SyncJob] Starting...');

  // Both DBs sync in parallel
  await Promise.all([
    syncCalls(db, syncFrom),
    syncOrders(db, syncFrom),
  ]);

  setLastSyncDate(db, dayjs().format('YYYY-MM-DD'));
  syncReady = true;

  logger.info(`[SyncJob] Done in ${Date.now() - t0}ms`);
};

// ── Scheduler ─────────────────────────────────────────────────────────────────

let timer = null;

/**
 * @param {number} intervalMs  default: 1 hour
 * @param {Function} onSyncDone  called after each sync (used to trigger cache warmer)
 */
export const startSyncSchedule = (intervalMs = 60 * 60 * 1000, onSyncDone) => {
  const run = async () => {
    try {
      await runSync();
      if (onSyncDone) onSyncDone();
    } catch (err) {
      logger.error(`[SyncJob] Failed: ${err.message}`);
    }
  };

  run(); // run immediately on startup
  timer = setInterval(run, intervalMs);
  logger.info(`[SyncJob] Scheduled every ${intervalMs / 60000} min`);
};

export const stopSyncSchedule = () => {
  if (timer) { clearInterval(timer); timer = null; }
};
