import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);
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

// ── Transfer Conversion campaign mapping (mirrors transfer.report.repository.js) ─
const TRANSFER_DIRECT_SQL  = `'Filtration_utilization', 'Filtration_Courtesy', 'Courtesy_1'`;
const TRANSFER_CASE_SQL    = `CASE
    WHEN campaign_name = 'Unayur_IN' AND queue_name = 'FreshAgentQueue'               THEN 'Fresh'
    WHEN campaign_name = 'Unayur_IN' AND queue_name = 'Verification_PendingAgentQueue' THEN 'Verification Pending'
    ELSE campaign_name
  END`;

const normPhone10 = (p) => {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : null;
};

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

const buildCallsQuery = (fromStr, toStr) => `
  WITH best AS (
    SELECT
      ch_date_added::date                AS summary_date,
      ch_call_id,
      COALESCE(udh_user_id, '')          AS udh_user_id,
      username,
      campaign_name,
      ch_campaign_id,
      ROW_NUMBER() OVER (
        PARTITION BY ch_call_id
        ORDER BY
          COALESCE(udh_talk_time, 0) DESC,
          (ch_system_disposition = 'CONNECTED')::int DESC,
          (rec_no = 1)::int DESC,
          (first_queue_answered = 't')::int DESC,
          ch_call_end_time DESC NULLS LAST
      ) AS rn
    FROM acd_interval_denormalized_entity
    WHERE
      campaign_name IN (${CAMPAIGN_NAMES_SQL})
      ${fromStr ? `AND ch_date_added >= '${fromStr}'::date` : ''}
      ${toStr   ? `AND ch_date_added <  '${toStr}'::date`   : ''}
  )
  SELECT
    summary_date,
    udh_user_id,
    username,
    campaign_name,
    ch_campaign_id                     AS campaign_id,
    COUNT(DISTINCT ch_call_id)::int    AS calls
  FROM best
  WHERE rn = 1
  GROUP BY summary_date, udh_user_id, username, campaign_name, ch_campaign_id`;

const syncCalls = async (db, syncFrom) => {
  // syncFrom = null means the table is empty → pull everything with no date filter
  if (!syncFrom) {
    logger.info('[SyncJob] PG calls — FULL (first ever sync)');
    const rows = await getPGSequelize().query(
      buildCallsQuery(null, null),
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

    const rows = await getPGSequelize().query(
      buildCallsQuery(fromStr, toStr),
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

// Convert an IST date string (YYYY-MM-DD) to its UTC equivalent for MSSQL.
// IST = UTC+5:30, so IST midnight = UTC 18:30 of the previous day.
// e.g. '2026-04-06' IST 00:00 → '2026-04-05 18:30:00' UTC
const syncOrders = async (db, syncFrom) => {
  // Use UTC date directly for summary_date — matches the reference query
  // (Book3: @fromDate='2026-04-06 00:00:00', @toDate='2026-04-07 00:00:00').
  // tblOrderDetails.createdOn is in UTC; bucket by UTC date so SQLite
  // summary_date aligns with the frontend date filter.
  const UTC_DATE = `CAST(createdOn AS DATE)`;

  if (!syncFrom) {
    logger.info('[SyncJob] MSSQL orders — FULL (first ever sync)');
    const rows = await getMSSQLSequelize().query(
      `SELECT
         ${UTC_DATE}                                                                    AS summary_date,
         campaign_Id,
         AgentID,
         COUNT(*) AS orders,
         SUM(CASE WHEN disposition_Code = 'Verified' THEN 1    ELSE 0    END)          AS verified,
         SUM(CASE WHEN disposition_Code = 'Verified' THEN ISNULL(total_amount,0) ELSE 0 END) AS verified_amount
       FROM tblOrderDetails
       GROUP BY ${UTC_DATE}, campaign_Id, AgentID`,
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

    // UTC midnight boundaries — same logic as the reference Book3 query
    const fromDt  = `${fromStr} 00:00:00`;
    const toFilter = toStr ? `AND createdOn < CAST('${toStr} 00:00:00' AS DATETIME)` : '';

    const rows = await getMSSQLSequelize().query(
      `SELECT
         ${UTC_DATE}                                                                    AS summary_date,
         campaign_Id,
         AgentID,
         COUNT(*) AS orders,
         SUM(CASE WHEN disposition_Code = 'Verified' THEN 1    ELSE 0    END)          AS verified,
         SUM(CASE WHEN disposition_Code = 'Verified' THEN ISNULL(total_amount,0) ELSE 0 END) AS verified_amount
       FROM tblOrderDetails
       WHERE createdOn >= CAST('${fromDt}' AS DATETIME)
         ${toFilter}
       GROUP BY ${UTC_DATE}, campaign_Id, AgentID`,
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

// ── Hangup sync helpers ───────────────────────────────────────────────────────

const getMaxHangupDate = (db) => {
  const row = db.prepare('SELECT MAX(summary_date) AS d FROM hangup_daily').get();
  return row?.d || null;
};

const _upsertHangupRows = (db, rows) => {
  if (!rows.length) return;
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO hangup_daily
      (summary_date, username, campaign_name,
       agent_hangup_phone, agent_hangup_ui, customer_hangup_phone,
       system_hangup, system_media, system_recording)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.transaction((rs) => {
    for (const r of rs) {
      upsert.run(
        String(r.summary_date),
        r.username,
        r.campaign_name || '',
        Number(r.agent_hangup_phone),
        Number(r.agent_hangup_ui),
        Number(r.customer_hangup_phone),
        Number(r.system_hangup),
        Number(r.system_media),
        Number(r.system_recording)
      );
    }
  })(rows);
};

const buildHangupQuery = (fromStr, toStr) => `
  SELECT
    ch_date_added::date                                                            AS summary_date,
    username,
    COALESCE(campaign_name, '')                                                    AS campaign_name,
    COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'AGENT_HANGUP_PHONE')       AS agent_hangup_phone,
    COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'AGENT_HANGUP_UI')          AS agent_hangup_ui,
    COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'CUSTOMER_HANGUP_PHONE')    AS customer_hangup_phone,
    COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'SYSTEM_HANGUP')            AS system_hangup,
    COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'SYSTEM_MEDIA')             AS system_media,
    COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'SYSTEM_RECORDING')         AS system_recording
  FROM acd_interval_denormalized_entity
  WHERE username IS NOT NULL AND username <> ''
    ${fromStr ? `AND ch_date_added >= '${fromStr}'::date` : ''}
    ${toStr   ? `AND ch_date_added <  '${toStr}'::date`  : ''}
  GROUP BY ch_date_added::date, username, campaign_name`;

const syncHangup = async (db, syncFrom) => {
  if (!syncFrom) {
    logger.info('[SyncJob] Hangup — FULL (first ever sync)');
    const rows = await getPGSequelize().query(buildHangupQuery(null, null), { type: QueryTypes.SELECT });
    logger.info(`[SyncJob] Hangup — full: ${rows.length} rows`);
    _upsertHangupRows(db, rows);
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

    const rows = await getPGSequelize().query(buildHangupQuery(fromStr, toStr), { type: QueryTypes.SELECT });
    logger.info(`[SyncJob] Hangup chunk ${chunk} [${fromStr} → ${toStr ?? 'latest'}]: ${rows.length} rows`);
    _upsertHangupRows(db, rows);
    total += rows.length;
    if (isLast) break;
    cursor = chunkEnd;
  }
  logger.info(`[SyncJob] Hangup — done: ${total} rows across ${chunk} chunk(s)`);
};

const getMaxTransferDate = (db) => {
  const row = db.prepare('SELECT MAX(summary_date) AS d FROM transfer_daily').get();
  return row?.d || null;
};

const _upsertTransferRows = (db, rows) => {
  if (!rows.length) return;
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO transfer_daily
      (summary_date, campaign_name, calls, transfer_to_sales, transfer_phones)
    VALUES (?, ?, ?, ?, ?)
  `);
  db.transaction((rs) => {
    for (const r of rs) {
      const phones = [...new Set(
        (r.transfer_phones || []).map(normPhone10).filter(Boolean)
      )];
      upsert.run(
        String(r.summary_date),
        r.campaign_name,
        Number(r.calls),
        Number(r.transfer_to_sales),
        JSON.stringify(phones)
      );
    }
  })(rows);
};

const syncTransferCalls = async (db, syncFrom) => {
  const buildQuery = (fromStr, toStr) => `
    SELECT
      ch_date_added::date   AS summary_date,
      ${TRANSFER_CASE_SQL}  AS campaign_name,
      COUNT(DISTINCT ch_call_id)::int AS calls,
      COUNT(DISTINCT ch_call_id) FILTER (WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales'))::int AS transfer_to_sales,
      ARRAY_REMOVE(
        ARRAY_AGG(ch_phone) FILTER (WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')),
        NULL
      ) AS transfer_phones
    FROM acd_interval_denormalized_entity
    WHERE
        ch_system_disposition = 'CONNECTED'
        AND rec_no = 1
        AND first_queue_answered = 't'
      AND (
        campaign_name IN (${TRANSFER_DIRECT_SQL})
        OR (campaign_name = 'Unayur_IN' AND queue_name IN ('FreshAgentQueue', 'Verification_PendingAgentQueue'))
      )
      ${fromStr ? `AND ch_date_added >= '${fromStr}'::date` : ''}
      ${toStr   ? `AND ch_date_added <  '${toStr}'::date`  : ''}
    GROUP BY ch_date_added::date, ${TRANSFER_CASE_SQL}`;

  if (!syncFrom) {
    logger.info('[SyncJob] Transfer — FULL (first ever sync)');
    const rows = await getPGSequelize().query(buildQuery(null, null), { type: QueryTypes.SELECT });
    logger.info(`[SyncJob] Transfer — full: ${rows.length} rows`);
    _upsertTransferRows(db, rows);
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

    const rows = await getPGSequelize().query(buildQuery(fromStr, toStr), { type: QueryTypes.SELECT });
    logger.info(`[SyncJob] Transfer chunk ${chunk} [${fromStr} → ${toStr ?? 'latest'}]: ${rows.length} rows`);
    _upsertTransferRows(db, rows);
    total += rows.length;
    if (isLast) break;
    cursor = chunkEnd;
  }
  logger.info(`[SyncJob] Transfer — done: ${total} rows across ${chunk} chunk(s)`);
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

  const maxTransferDate  = getMaxTransferDate(db);
  const transferSyncFrom = maxTransferDate ? dayjs(maxTransferDate).subtract(2, 'day').format('YYYY-MM-DD') : null;

  const maxHangupDate  = getMaxHangupDate(db);
  const hangupSyncFrom = maxHangupDate ? dayjs(maxHangupDate).subtract(2, 'day').format('YYYY-MM-DD') : null;

  await Promise.all([
    syncCalls(db, callsSyncFrom),
    syncOrders(db, ordersSyncFrom),
    syncTransferCalls(db, transferSyncFrom),
    syncHangup(db, hangupSyncFrom),
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
