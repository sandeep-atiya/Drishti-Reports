import { QueryTypes } from 'sequelize';
import { getMSSQLSequelize, getPGSequelize } from '../../connections/index.js';
import logger from '../../utils/logger.js';
import { getSQLite } from '../../config/sqlite.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

// These 3 campaigns are matched directly by campaign_name
const DIRECT_CAMPAIGNS_SQL = `'Filtration_utilization', 'Filtration_Courtesy', 'Courtesy_1'`;

// Fresh and Verification Pending live inside the Unayur_IN campaign,
// distinguished by queue_name.  The CASE WHEN in the query maps them to
// the display names expected by the service / frontend.

/**
 * Normalise any phone format to the last 10 digits.
 * Handles all common formats:
 *   +91XXXXXXXXXX  →  XXXXXXXXXX
 *   91XXXXXXXXXX   →  XXXXXXXXXX
 *   XXXXXXXXXX     →  XXXXXXXXXX  (unchanged)
 *   0XXXXXXXXXX    →  XXXXXXXXXX
 */
export const normPhone = (p) => {
  if (!p) return null;
  const digits = String(p).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
};

// MSSQL IN-list limit is ~2100 parameters; stay well below it
const MOBILE_BATCH = 1000;

/**
 * Convert an IST date/datetime string to a UTC string for MSSQL.
 *
 * Why: PostgreSQL timestamps are IST. MSSQL stores createdOn in UTC.
 * Querying MSSQL with IST boundaries causes a 5:30-hour shift — orders
 * created between 00:00–05:30 IST are completely missed for today.
 *
 * Examples (IST → UTC):
 *   '2026-04-06'          → '2026-04-05 18:30:00'
 *   '2026-04-06T10:00'    → '2026-04-06 04:30:00'
 *   '2026-04-07'          → '2026-04-06 18:30:00'
 */
const istToMSSQLUtc = (s) => {
  if (!s) return s;
  // Normalise: replace T separator, ensure seconds present
  let normalized = String(s).replace('T', ' ').trim();
  if (normalized.length === 10)                               normalized += ' 00:00:00';
  else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) normalized += ':00';

  // Parse as IST, output as UTC in MSSQL-compatible format
  return dayjs.tz(normalized, 'Asia/Kolkata').utc().format('YYYY-MM-DD HH:mm:ss');
};

// ── PostgreSQL: calls + transfer_to_sales count + phone list per campaign ─────
//
// Fresh and Verification Pending come from campaign_name = 'Unayur_IN',
// split by queue_name.  A CASE WHEN maps them to their display names so the
// service can look them up by 'Fresh' / 'Verification Pending' directly.

export const pgGetTransferData = ({ startDate, endDate }) =>
  getPGSequelize().query(
    `SELECT
       CASE
         WHEN campaign_name = 'Unayur_IN' AND queue_name = 'FreshAgentQueue'
           THEN 'Fresh'
         WHEN campaign_name = 'Unayur_IN' AND queue_name = 'Verification_PendingAgentQueue'
           THEN 'Verification Pending'
         ELSE campaign_name
       END                          AS campaign_name,
       COUNT(*)::int                AS calls,
       COUNT(*) FILTER (
         WHERE udh_disposition_code = 'Transfer_to_sales'
       )::int                       AS transfer_to_sales,
       ARRAY_REMOVE(
         ARRAY_AGG(ch_phone) FILTER (
           WHERE udh_disposition_code = 'Transfer_to_sales'
         ),
         NULL
       )                            AS transfer_phones
     FROM acd_interval_denormalized_entity
     WHERE
       ch_system_disposition = 'CONNECTED'
       AND (
         campaign_name IN (${DIRECT_CAMPAIGNS_SQL})
         OR (
           campaign_name = 'Unayur_IN'
           AND queue_name IN ('FreshAgentQueue', 'Verification_PendingAgentQueue')
         )
       )
       AND (ch_hangup_details IS NULL
            OR ch_hangup_details NOT IN ('Customer_Hangup_Phone', 'Customer_hangup_ui'))
       AND udh_disposition_code IS DISTINCT FROM 'Call_Drop'
       AND uch_talk_time > 5
       AND ch_date_added >= :startDate::timestamp
       AND ch_date_added <  :endDate::timestamp
     GROUP BY
       CASE
         WHEN campaign_name = 'Unayur_IN' AND queue_name = 'FreshAgentQueue'
           THEN 'Fresh'
         WHEN campaign_name = 'Unayur_IN' AND queue_name = 'Verification_PendingAgentQueue'
           THEN 'Verification Pending'
         ELSE campaign_name
       END`,
    { replacements: { startDate, endDate }, type: QueryTypes.SELECT }
  );

// ── SQLite: fast aggregate read for date-mode queries ─────────────────────────
// Returns the same shape as pgGetTransferData but reads from the local cache.
// Only suitable when startDate / endDate are YYYY-MM-DD (no time component).

export const sqliteGetTransferData = ({ startDate, endDate }) => {
  const db   = getSQLite();
  const rows = db.prepare(`
    SELECT campaign_name, SUM(calls) AS calls,
           SUM(transfer_to_sales) AS transfer_to_sales,
           GROUP_CONCAT(transfer_phones, '|||') AS phones_json_list
    FROM transfer_daily
    WHERE summary_date >= ? AND summary_date < ?
    GROUP BY campaign_name
  `).all(startDate, endDate);

  return rows.map((r) => {
    // Merge JSON arrays from multiple daily rows
    const allPhones = (r.phones_json_list || '')
      .split('|||')
      .flatMap((chunk) => { try { return JSON.parse(chunk); } catch { return []; } });

    return {
      campaign_name:    r.campaign_name,
      calls:            Number(r.calls),
      transfer_to_sales: Number(r.transfer_to_sales),
      transfer_phones:  [...new Set(allPhones)],
    };
  });
};

// ── MSSQL: orders whose mobile matches any of the transferred phones ──────────
// Batches the IN-list to stay below the MSSQL parameter limit.
// Checks all three mobile columns (mobile, alterMob, Mobile3) after normalising
// each to its last 10 digits so that +91/0 prefixes don't break the match.

export const msGetOrdersByMobiles = async ({ startDate, endDate, mobiles }) => {
  const normSet = [...new Set((mobiles || []).map(normPhone).filter(Boolean))];
  if (!normSet.length) return [];

  const allRows = [];

  for (let i = 0; i < normSet.length; i += MOBILE_BATCH) {
    const batch = normSet.slice(i, i + MOBILE_BATCH);
    // Embed as string literals — normPhone guarantees digits-only, so no injection risk
    const ph = batch.map((m) => `'${m}'`).join(',');

    const dtStart = istToMSSQLUtc(startDate);
    const dtEnd   = istToMSSQLUtc(endDate);

    const rows = await getMSSQLSequelize().query(
      `SELECT
         LTRIM(RTRIM(ISNULL(mobile,   ''))) AS mobile,
         LTRIM(RTRIM(ISNULL(alterMob, ''))) AS alterMob,
         LTRIM(RTRIM(ISNULL(Mobile3,  ''))) AS mobile3
       FROM tblOrderDetails
       WHERE createdOn >= CAST('${dtStart}' AS DATETIME)
         AND createdOn <  CAST('${dtEnd}'   AS DATETIME)
         AND (
           RIGHT(LTRIM(RTRIM(ISNULL(mobile,   ''))), 10) IN (${ph})
           OR RIGHT(LTRIM(RTRIM(ISNULL(alterMob, ''))), 10) IN (${ph})
           OR RIGHT(LTRIM(RTRIM(ISNULL(Mobile3,  ''))), 10) IN (${ph})
         )`,
      { type: QueryTypes.SELECT }
    );

    logger.info(
      `[TransferRepo] MSSQL batch ${Math.floor(i / MOBILE_BATCH) + 1}/${Math.ceil(normSet.length / MOBILE_BATCH)}: ${rows.length} orders`
    );
    allRows.push(...rows);
  }

  return allRows;
};
