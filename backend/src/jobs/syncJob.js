import dayjs from 'dayjs';
import { QueryTypes } from 'sequelize';
import { getSQLite } from '../config/sqlite.js';
import { getMSSQLSequelize, getPGSequelize } from '../connections/index.js';
import logger from '../utils/logger.js';

const CAMPAIGN_NAMES_SQL = `'Digital inbound', 'Inbound_2'`;

/**
 * Max days to query in a single PG/MSSQL batch.
 * The archival PG table receives ~1 crore records/day.  Chunking prevents
 * timeout and memory spikes when the server has been offline for weeks/months
 * or during the initial catch-up from a stale SQLite cache.
 *
 * Normal hourly incremental syncs only ever query 2–3 days so they always
 * run as a single chunk regardless of this setting.
 */
const CHUNK_DAYS = 30;

// In-memory flag — true once the first full sync finishes
let syncReady = false;
export const isSyncReady = () => syncReady;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the latest summary_date actually present in calls_daily.
 * Using the actual data max (not a wall-clock timestamp) means the incremental
 * sync always starts from where real data ends, automatically filling any gap
 * no matter how long the server was offline.
 */
const getMaxCallsDate = (db) => {
  const row = db.prepare('SELECT MAX(summary_date) AS d FROM calls_daily').get();
  return row?.d || null;
};

const getMaxOrdersDate = (db) => {
  const row = db.prepare('SELECT MAX(summary_date) AS d FROM orders_daily').get();
  return row?.d || null;
};

const setLastSyncDate = (db, date) => {
  db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync_date', ?)").run(date);
};

// ── Low-level: upsert one chunk of PG call rows into SQLite ──────────────────

const _upsertCallRows = (db, rows) => {
  if (!rows.length) return;
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO calls_daily
      (summary_date, udh_user_id, username, campaign_name, campaign_id, calls)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  db.transaction((rs) => {
    for (const r of rs) {
      upsert.run(
        String(r.summary_date),
        r.udh_user_id  || '',
        r.username     || null,
        r.campaign_name,
        String(r.campaign_id),
        Number(r.calls)
      );
    }
  })(rows);
};

const _upsertOrderRows = (db, rows) => {
  if (!rows.length) return;
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO orders_daily
      (summary_date, campaign_id, agent_id, orders, verified, verified_amount)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  db.transaction((rs) => {
    for (const r of rs) {
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

// ── Pull calls from PostgreSQL (chunked to handle large date ranges) ──────────

const syncCalls = async (db, syncFrom) => {
  // syncFrom = null means the table is empty → pull everything with no date filter
  if (!syncFrom) {
    logger.info('[SyncJob] PG calls — FULL (first ever sync)');
    const rows = await getPGSequelize().query(
      `SELECT
         ch_date_added::date         AS summary_date,
         COALESCE(udh_user_id, '')   AS udh_user_id,
         username,
         campaign_name,
         ch_campaign_id              AS campaign_id,
         COUNT(*)                    AS calls
       FROM acd_interval_denormalized_entity
       WHERE
         ch_system_disposition = 'CONNECTED'
         AND campaign_name IN (${CAMPAIGN_NAMES_SQL})
         AND ch_hangup_details NOT IN ('Customer_Hangup_Phone', 'Customer_hangup_ui')
         AND udh_disposition_code IS DISTINCT FROM 'Call_Drop'
         AND uch_talk_time > 5
       GROUP BY ch_date_added::date, udh_user_id, username, campaign_name, ch_campaign_id`,
      { type: QueryTypes.SELECT }
    );
    logger.info(`[SyncJob] PG calls — full: ${rows.length} rows`);
    _upsertCallRows(db, rows);
    return;
  }

  // Chunked incremental sync: break [syncFrom … today] into CHUNK_DAYS windows.
  // For a normal hourly run the gap is only 2 days → single chunk, no overhead.
  // For a long outage catch-up (weeks/months of 1-crore-record/day data) this
  // prevents query timeout and Node memory spikes.
  const today  = dayjs().startOf('day');
  let   cursor = dayjs(syncFrom);
  let   chunk  = 0;
  let   total  = 0;

  while (cursor.valueOf() <= today.valueOf()) {
    const chunkEnd = cursor.add(CHUNK_DAYS, 'day');
    const isLast   = chunkEnd.valueOf() > today.valueOf();
    const fromStr  = cursor.format('YYYY-MM-DD');
    const toStr    = isLast ? null : chunkEnd.format('YYYY-MM-DD');
    chunk++;

    const toFilter   = toStr ? `AND ch_date_added <  '${toStr}'::date` : '';
    const rows = await getPGSequelize().query(
      `SELECT
         ch_date_added::date         AS summary_date,
         COALESCE(udh_user_id, '')   AS udh_user_id,
         username,
         campaign_name,
         ch_campaign_id              AS campaign_id,
         COUNT(*)                    AS calls
       FROM acd_interval_denormalized_entity
       WHERE
         ch_system_disposition = 'CONNECTED'
         AND campaign_name IN (${CAMPAIGN_NAMES_SQL})
         AND ch_hangup_details NOT IN ('Customer_Hangup_Phone', 'Customer_hangup_ui')
         AND udh_disposition_code IS DISTINCT FROM 'Call_Drop'
         AND uch_talk_time > 5
         AND ch_date_added >= '${fromStr}'::date
         ${toFilter}
       GROUP BY ch_date_added::date, udh_user_id, username, campaign_name, ch_campaign_id`,
      { type: QueryTypes.SELECT }
    );

    logger.info(`[SyncJob] PG calls chunk ${chunk} [${fromStr} → ${toStr ?? 'latest'}]: ${rows.length} rows`);
    _upsertCallRows(db, rows);
    total += rows.length;

    if (isLast) break;
    cursor = chunkEnd;
  }

  logger.info(`[SyncJob] PG calls — done: ${total} rows across ${chunk} chunk(s)`);
};

// ── Pull orders from MSSQL (chunked) ─────────────────────────────────────────

const syncOrders = async (db, syncFrom) => {
  if (!syncFrom) {
    logger.info('[SyncJob] MSSQL orders — FULL (first ever sync)');
    const rows = await getMSSQLSequelize().query(
      `SELECT
         CAST(createdOn AS DATE) AS summary_date,
         campaign_Id,
         AgentID,
         COUNT(*) AS orders,
         SUM(CASE WHEN disposition_Code = 'Verified' THEN 1    ELSE 0    END) AS verified,
         SUM(CASE WHEN disposition_Code = 'Verified' THEN ISNULL(total_amount,0) ELSE 0 END) AS verified_amount
       FROM tblOrderDetails
       GROUP BY CAST(createdOn AS DATE), campaign_Id, AgentID`,
      { type: QueryTypes.SELECT }
    );
    logger.info(`[SyncJob] MSSQL orders — full: ${rows.length} rows`);
    _upsertOrderRows(db, rows);
    return;
  }

  const today  = dayjs().startOf('day');
  let   cursor = dayjs(syncFrom);
  let   chunk  = 0;
  let   total  = 0;

  while (cursor.valueOf() <= today.valueOf()) {
    const chunkEnd = cursor.add(CHUNK_DAYS, 'day');
    const isLast   = chunkEnd.valueOf() > today.valueOf();
    const fromStr  = cursor.format('YYYY-MM-DD');
    const toStr    = isLast ? null : chunkEnd.format('YYYY-MM-DD');
    chunk++;

    const toFilter = toStr ? `AND createdOn < CAST('${toStr}' AS DATETIME)` : '';
    const rows = await getMSSQLSequelize().query(
      `SELECT
         CAST(createdOn AS DATE) AS summary_date,
         campaign_Id,
         AgentID,
         COUNT(*) AS orders,
         SUM(CASE WHEN disposition_Code = 'Verified' THEN 1    ELSE 0    END) AS verified,
         SUM(CASE WHEN disposition_Code = 'Verified' THEN ISNULL(total_amount,0) ELSE 0 END) AS verified_amount
       FROM tblOrderDetails
       WHERE createdOn >= CAST('${fromStr}' AS DATETIME)
         ${toFilter}
       GROUP BY CAST(createdOn AS DATE), campaign_Id, AgentID`,
      { type: QueryTypes.SELECT }
    );

    logger.info(`[SyncJob] MSSQL orders chunk ${chunk} [${fromStr} → ${toStr ?? 'latest'}]: ${rows.length} rows`);
    _upsertOrderRows(db, rows);
    total += rows.length;

    if (isLast) break;
    cursor = chunkEnd;
  }

  logger.info(`[SyncJob] MSSQL orders — done: ${total} rows across ${chunk} chunk(s)`);
};

// ── Main sync ─────────────────────────────────────────────────────────────────

export const runSync = async () => {
  const db = getSQLite();

  // Derive sync start from the latest data actually in each table.
  // Go back 2 days to catch any late-arriving records (e.g. records inserted
  // into PG for yesterday after yesterday's sync already ran).
  // null → table is empty, trigger a full historical sync.
  const maxCallsDate  = getMaxCallsDate(db);
  const maxOrdersDate = getMaxOrdersDate(db);
  const callsSyncFrom  = maxCallsDate  ? dayjs(maxCallsDate).subtract(2,  'day').format('YYYY-MM-DD') : null;
  const ordersSyncFrom = maxOrdersDate ? dayjs(maxOrdersDate).subtract(2, 'day').format('YYYY-MM-DD') : null;

  const t0 = Date.now();
  logger.info(`[SyncJob] Starting — calls from ${callsSyncFrom ?? 'FULL'}, orders from ${ordersSyncFrom ?? 'FULL'}`);

  // Run both DBs in parallel (each handles its own chunking internally)
  await Promise.all([
    syncCalls(db, callsSyncFrom),
    syncOrders(db, ordersSyncFrom),
  ]);

  setLastSyncDate(db, dayjs().format('YYYY-MM-DD'));
  syncReady = true;

  logger.info(`[SyncJob] Finished in ${Date.now() - t0}ms`);
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
